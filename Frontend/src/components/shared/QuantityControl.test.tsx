import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QuantityControl } from './QuantityControl'

describe('QuantityControl', () => {
  it('renderiza el valor actual y permite incrementar', async () => {
    const user = userEvent.setup()
    const onIncrease = vi.fn()
    render(
      <QuantityControl
        value={2}
        onDecrease={() => {}}
        onIncrease={onIncrease}
        onChange={() => {}}
      />,
    )

    const button = screen.getByRole('button', { name: '+' })
    await user.click(button)

    expect(onIncrease).toHaveBeenCalledTimes(1)
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
  })

  it('actualiza el valor al escribir en el input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <QuantityControl
        value={1}
        onDecrease={() => {}}
        onIncrease={() => {}}
        onChange={onChange}
      />,
    )

    const input = screen.getByRole('spinbutton')
    await user.clear(input)
    await user.type(input, '3')

    expect(onChange).toHaveBeenCalled()
  })
})
