import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../../api'
import { ProjectContext } from '../../contexts'
import { Campaign, CampaignCreateParams, List, Project, Provider, SearchParams, Subscription } from '../../types'
import { useController, UseFormReturn, useWatch } from 'react-hook-form'
import TextField from '../../ui/form/TextField'
import FormWrapper from '../../ui/form/FormWrapper'
import Heading from '../../ui/Heading'
import ListTable from '../users/ListTable'
import { SingleSelect } from '../../ui/form/SingleSelect'
import { snakeToTitle } from '../../utils'
import OptionField from '../../ui/form/OptionField'
import { SelectionProps } from '../../ui/form/Field'
import { TagPicker } from '../settings/TagPicker'
import { Column, Columns } from '../../ui/Columns'
import Modal from '../../ui/Modal'
import Button from '../../ui/Button'
import { DataTable } from '../../ui/DataTable'

interface CampaignEditParams {
    campaign?: Campaign
    onSave: (campaign: Campaign) => void
    disableListSelection?: boolean
}

interface ListSelectionProps extends SelectionProps<CampaignCreateParams> {
    project: Project
    title: string
    value?: List[]
}

const ListSelection = ({
    project,
    control,
    name,
    title,
    value,
}: ListSelectionProps) => {
    const [isOpen, setIsOpen] = useState(false)
    const [lists, setLists] = useState<List[]>(value ?? [])
    const search = useCallback(async (params: SearchParams) => await api.lists.search(project.id, params), [project])

    const handlePickList = (list: List) => {
        const newLists = [...lists.filter(item => item.id !== list.id), list]
        setLists(newLists)
        onChange(newLists.map(list => list.id))
        setIsOpen(false)
    }

    const { field: { onChange } } = useController({
        control,
        name,
        rules: {
            required: true,
        },
    })

    return (
        <>
            <Heading size="h4" title={title} actions={
                <Button
                    size="small"
                    onClick={() => setIsOpen(true)}>Add List</Button>
            } />
            <DataTable
                items={lists}
                itemKey={({ item }) => item.id}
                columns={[
                    { key: 'name' },
                    {
                        key: 'type',
                        cell: ({ item: { type } }) => snakeToTitle(type),
                    },
                    { key: 'users_count' },
                    { key: 'updated_at' },
                ]}
                emptyMessage="Select one or more lists using the button above."
            />
            <Modal
                open={isOpen}
                onClose={setIsOpen}
                title={title}
                size="large">
                <ListTable
                    search={search}
                    onSelectRow={handlePickList}
                />
            </Modal>
        </>
    )
}

const ChannelSelection = ({ subscriptions, form }: {
    subscriptions: Subscription[]
    form: UseFormReturn<CampaignCreateParams>
}) => {
    const channels = [...new Set(subscriptions.map(item => item.channel))].map(item => ({
        key: item,
        label: snakeToTitle(item),
    }))
    return (
        <OptionField
            form={form}
            name="channel"
            label="Medium"
            options={channels}
            required
        />
    )
}

const SubscriptionSelection = ({ subscriptions, form }: { subscriptions: Subscription[], form: UseFormReturn<CampaignCreateParams> }) => {
    const channel = useWatch({
        control: form.control,
        name: 'channel',
    })
    subscriptions = useMemo(() => channel ? subscriptions.filter(s => s.channel === channel) : [], [channel, subscriptions])
    useEffect(() => {
        if (channel && subscriptions.length) {
            const { subscription_id } = form.getValues()
            if (!subscription_id || !subscriptions.find(s => s.id === subscription_id)) {
                form.setValue('subscription_id', subscriptions[0].id)
            }
        }
    }, [channel, form, subscriptions])
    return (
        <SingleSelect.Field
            form={form}
            name="subscription_id"
            label="Subscription Group"
            options={subscriptions}
            required
            toValue={x => x.id}
        />
    )
}

const ProviderSelection = ({ providers, form }: { providers: Provider[], form: UseFormReturn<CampaignCreateParams> }) => {
    const channel = useWatch({
        control: form.control,
        name: 'channel',
    })
    providers = useMemo(() => channel ? providers.filter(p => p.group === channel) : [], [channel, providers])
    useEffect(() => {
        if (channel && providers.length) {
            const { provider_id } = form.getValues()
            if (!provider_id || !providers.find(p => p.id === provider_id)) {
                form.setValue('provider_id', providers[0].id)
            }
        }
    }, [channel, form, providers])
    return (
        <SingleSelect.Field
            form={form}
            name="provider_id"
            label="Provider"
            options={providers}
            required
            toValue={x => x.id}
        />
    )
}

export function CampaignForm({ campaign, disableListSelection, onSave }: CampaignEditParams) {
    const [project] = useContext(ProjectContext)

    const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
    useEffect(() => {
        const params: SearchParams = { page: 0, itemsPerPage: 9999, q: '' }
        api.subscriptions.search(project.id, params)
            .then(({ results }) => {
                setSubscriptions(results)
            })
            .catch(() => {})
    }, [])

    const [providers, setProviders] = useState<Provider[]>([])
    useEffect(() => {
        api.providers.all(project.id)
            .then((results) => {
                setProviders(results)
            })
            .catch(() => {})
    }, [])

    async function handleSave({
        name,
        list_ids,
        exclusion_list_ids,
        channel,
        provider_id,
        subscription_id,
        tags,
    }: CampaignCreateParams) {
        const params = { name, list_ids, exclusion_list_ids, subscription_id, tags }
        const value = campaign
            ? await api.campaigns.update(project.id, campaign.id, params)
            : await api.campaigns.create(project.id, { channel, provider_id, ...params })
        onSave(value)
    }

    return (
        <FormWrapper<CampaignCreateParams>
            onSubmit={async (item) => await handleSave(item)}
            defaultValues={campaign}
            submitLabel="Save"
        >
            {form => (
                <>
                    <TextField form={form}
                        name="name"
                        label="Campaign Name"
                        required
                    />
                    <TagPicker.Field
                        form={form}
                        name="tags"
                    />
                    {
                        !disableListSelection && (
                            <>
                                <Heading size="h3" title="Lists">
                                    Select what lists to send this campaign to and what user lists you want to exclude from getting the campaign.
                                </Heading>
                                <ListSelection
                                    project={project}
                                    title="Send Lists"
                                    name="list_ids"
                                    value={campaign?.lists}
                                    control={form.control}
                                />
                                <ListSelection
                                    project={project}
                                    title="Exclusion Lists"
                                    name="exclusion_list_ids"
                                    value={campaign?.exclusion_lists}
                                    control={form.control}
                                />
                            </>
                        )
                    }
                    {
                        campaign
                            ? (
                                <>
                                    <Heading size="h3" title="Channel">
                                        This campaign is being sent over the <strong>{campaign.channel}</strong> channel. Set the subscription group this message will be associated to.
                                    </Heading>
                                    <SubscriptionSelection
                                        subscriptions={subscriptions}
                                        form={form}
                                    />
                                </>
                            )
                            : (
                                <>
                                    <Heading size="h3" title="Channel">
                                        Setup the channel this campaign will go out on. The medium is the type of message, provider the sender that will process the message and subscription group the unsubscribe group associated to the campaign.
                                    </Heading>
                                    <ChannelSelection
                                        subscriptions={subscriptions}
                                        form={form}
                                    />
                                    <Columns>
                                        <Column>
                                            <ProviderSelection
                                                providers={providers}
                                                form={form}
                                            />
                                        </Column>
                                        <Column>
                                            <SubscriptionSelection
                                                subscriptions={subscriptions}
                                                form={form}
                                            />
                                        </Column>
                                    </Columns>
                                </>
                            )
                    }
                </>
            )}
        </FormWrapper>
    )
}
