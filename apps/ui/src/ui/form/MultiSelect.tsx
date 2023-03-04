import { Listbox, Transition } from '@headlessui/react'
import { Fragment, ReactNode } from 'react'
import { CheckIcon, ChevronUpDownIcon } from '../icons'
import { FieldPath, FieldValues, useController } from 'react-hook-form'
import { defaultGetOptionDisplay, defaultGetValueKey, defaultToValue, usePopperSelectDropdown } from '../utils'
import { ControlledInputProps, FieldBindingsProps, OptionsProps } from '../../types'
import clsx from 'clsx'

export interface MultiSelectProps<T, O = T> extends ControlledInputProps<T[]>, OptionsProps<O, T> {
    className?: string
    buttonClassName?: string
    getSelectedOptionDisplay?: (option: O) => ReactNode
    optionsFooter?: ReactNode
    size?: 'small' | 'regular'
    variant?: 'plain' | 'minimal'
}

export function MultiSelect<T, U = T>({
    buttonClassName,
    className,
    disabled,
    error,
    getOptionDisplay = defaultGetOptionDisplay,
    getSelectedOptionDisplay = getOptionDisplay,
    hideLabel,
    label,
    options,
    optionsFooter,
    onChange,
    required,
    size,
    subtitle,
    toValue = defaultToValue,
    getValueKey = defaultGetValueKey,
    value,
    variant,
}: MultiSelectProps<T, U>) {

    const {
        setReferenceElement,
        setPopperElement,
        attributes,
        styles,
    } = usePopperSelectDropdown()

    const { valid, invalid } = (value ?? []).reduce((a, v) => {
        const valueKey = getValueKey(v)
        const option = options.find(o => getValueKey(toValue(o)) === valueKey)
        if (option) {
            a.valid.push(
                <Fragment key={valueKey}>
                    {getSelectedOptionDisplay(option)}
                </Fragment>,
            )
        } else {
            a.invalid.push(v)
        }
        return a
    }, {
        valid: [] as ReactNode[],
        invalid: [] as T[],
    })

    return (
        <Listbox
            as='div'
            className={clsx('ui-select', className, variant ?? 'plain')}
            by={(left: T, right: T) => Object.is(getValueKey(left), getValueKey(right))}
            disabled={disabled}
            value={value}
            onChange={onChange}
            multiple
        >
            <Listbox.Label style={hideLabel ? { display: 'none' } : undefined}>
                {
                    label && (
                        <span>
                            {label}
                            {
                                required && (
                                    <span style={{ color: 'red' }}>&nbsp;*</span>
                                )
                            }
                        </span>
                    )
                }
            </Listbox.Label>
            {
                subtitle && (
                    <span className='label-subtitle'>
                        {subtitle}
                    </span>
                )
            }
            <Listbox.Button className={clsx('select-button', size, buttonClassName)} ref={setReferenceElement}>
                <span className="select-button-label">
                    {
                        value?.length
                            ? (
                                <>
                                    {valid}
                                    {
                                        !!invalid.length && (
                                            <span>
                                                {`+${invalid.length} Invalid Values`}
                                            </span>
                                        )
                                    }
                                </>
                            )
                            : 'None Selected'
                    }
                </span>
                <span className="select-button-icon">
                    <ChevronUpDownIcon aria-hidden="true" />
                </span>
            </Listbox.Button>
            {
                (error && !hideLabel) && (
                    <span className='field-error'>
                        {error}
                    </span>
                )
            }
            <Transition
                as={Fragment}
                leave="transition-leave"
                leaveFrom="transition-leave-from"
                leaveTo="transition-leave-to"
                enter="transition-enter"
                enterFrom="transition-enter-from"
                enterTo="transition-enter-to"
            >
                <Listbox.Options
                    className="select-options"
                    ref={setPopperElement}
                    style={styles.popper}
                    {...attributes.popper}
                >
                    {options.map((option) => {
                        const value = toValue(option)
                        return (
                            <Listbox.Option
                                key={getValueKey(value)}
                                value={value}
                                className={({ active, selected }) => clsx(
                                    'select-option',
                                    active && 'active',
                                    selected && 'selected',
                                )}
                            >
                                <span>{getOptionDisplay(option)}</span>
                                <span className="option-icon">
                                    <CheckIcon aria-hidden="true" />
                                </span>
                            </Listbox.Option>
                        )
                    })}
                    {optionsFooter}
                </Listbox.Options>
            </Transition>
        </Listbox>
    )
}

MultiSelect.Field = function MultiSelectField<X extends FieldValues, P extends FieldPath<X>>({
    form,
    name,
    required,
    ...rest
}: FieldBindingsProps<MultiSelectProps<any>, any, X, P>) {

    const { field, fieldState } = useController({
        control: form.control,
        name,
        rules: {
            required,
        },
    })

    return (
        <MultiSelect
            {...rest}
            {...field}
            required={required}
            error={fieldState.error?.message}
        />
    )
}
