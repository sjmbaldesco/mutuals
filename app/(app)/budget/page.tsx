'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Wallet, Lock, TrendingUp, TrendingDown } from 'lucide-react'
import { toast } from 'sonner'

export default function BudgetPage() {
  const [entries, setEntries] = useState<any[]>([])
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  // Form State
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetchData = async () => {
    const res = await fetch('/api/budget')
    if (res.ok) {
      const data = await res.json()
      setEntries(data.entries || [])
      setBalance(data.available_balance || 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    const res = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        amount: parseFloat(amount),
        description,
        entry_date: entryDate
      })
    })

    if (res.ok) {
      setShowForm(false)
      setAmount('')
      setDescription('')
      fetchData()
      toast.success('Entry added')
    } else {
      const { error } = await res.json()
      toast.error(error)
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/budget?id=${id}`, {
      method: 'DELETE'
    })
    if (res.ok) {
      fetchData()
      toast.success('Entry deleted')
    } else {
      toast.error('Failed to delete entry')
    }
  }

  const incomes = entries.filter(e => e.type === 'income')
  const expenses = entries.filter(e => e.type === 'expense')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Wallet className="w-6 h-6 mr-2 text-blue-600" />
            Budget Ledger
          </h1>
          <p className="mt-1 text-sm text-gray-500 flex items-center">
            <Lock className="w-3.5 h-3.5 mr-1" />
            Private — only you can see this
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Entry
        </button>
      </div>

      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-sm p-6 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-blue-100 font-medium text-sm">Available Balance</h2>
          <p className="text-4xl font-bold mt-1 tracking-tight">
            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <Wallet className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-blue-500 opacity-20" />
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${type === 'expense' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${type === 'income' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Income
              </button>
            </div>
          </div>
          
          <div className="w-full md:w-auto flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input 
                type="number" 
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full rounded-lg border-0 py-2 pl-7 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="w-full md:w-auto flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
              placeholder="e.g. Salary, Rent"
            />
          </div>

          <div className="w-full md:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input 
              type="date" 
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm"
            />
          </div>

          <div className="w-full md:w-auto">
            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-500 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Add'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Income Column */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-green-50 px-4 py-3 border-b border-green-100 flex items-center justify-between">
              <h3 className="font-semibold text-green-800 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" /> Income
              </h3>
              <span className="text-sm font-medium text-green-700">
                ${incomes.reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {incomes.length > 0 ? incomes.map(entry => (
                <div key={entry.id} className="p-4 flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.description || 'Income'}</p>
                    <p className="text-xs text-gray-500">{new Date(entry.entry_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-green-600">+${Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <button 
                      onClick={() => handleDelete(entry.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded md:opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete income entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-sm text-gray-500">No income entries found.</div>
              )}
            </div>
          </div>

          {/* Expense Column */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex items-center justify-between">
              <h3 className="font-semibold text-red-800 flex items-center">
                <TrendingDown className="w-4 h-4 mr-2" /> Expenses
              </h3>
              <span className="text-sm font-medium text-red-700">
                ${expenses.reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {expenses.length > 0 ? expenses.map(entry => (
                <div key={entry.id} className="p-4 flex items-center justify-between group">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{entry.description || 'Expense'}</p>
                    <p className="text-xs text-gray-500">{new Date(entry.entry_date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-red-600">-${Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <button 
                      onClick={() => handleDelete(entry.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded md:opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Delete expense entry"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-8 text-center text-sm text-gray-500">No expense entries found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
