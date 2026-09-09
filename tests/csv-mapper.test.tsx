import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CsvImportMapper } from '../src/components/CsvImportMapper'
import { readCsvSheet } from '../src/lib/csvImport'
afterEach(cleanup)
it('requires an account before reviewing and returns the mapped holdings', () => {
  const review = vi.fn()
  render(<CsvImportMapper sheet={readCsvSheet('symbol,quantity,average_cost,current_price\nVAS,10,90,100')} filename="test.csv" source="CSV" onClose={vi.fn()} onReview={review}/> )
  fireEvent.click(screen.getByRole('button', {name:'Review import'}))
  expect(screen.getByRole('alert')).toHaveTextContent('Name the account')
  expect(review).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Account name'), {target:{value:'My broker'}})
  fireEvent.click(screen.getByRole('button', {name:'Review import'}))
  expect(review).toHaveBeenCalledWith(expect.objectContaining({ holdings:[expect.objectContaining({symbol:'VAS', quantity:10, account_name:'My broker'})] }))
})
