import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Plus, TrendingUp, TrendingDown, DollarSign, Receipt, Download, Trash2, Search, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string | null;
  student_id: string | null;
  course_id: string | null;
  receipt_number: string | null;
  payment_method: string | null;
  transaction_date: string;
  created_at: string;
  created_by: string;
}

const INCOME_CATEGORIES = ['Tuition', 'Course Fee', 'Registration', 'Donation', 'Other'];
const EXPENSE_CATEGORIES = ['Salary', 'Supplies', 'Equipment', 'Utilities', 'Maintenance', 'Marketing', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Card', 'Bank Transfer', 'UPI', 'Cheque', 'Other'];

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(210, 100%, 50%)', 'hsl(280, 100%, 50%)', 'hsl(30, 100%, 50%)', 'hsl(160, 100%, 40%)'];

export default function AdminTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  
  // Form state
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
  });

  // Fetch kit orders for summary
  const { data: kitOrders = [] } = useQuery({
    queryKey: ['kit-orders-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_orders')
        .select('id, price, status, order_date, kit_name, student_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  type TransactionInsert = {
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description?: string | null;
    student_id?: string | null;
    course_id?: string | null;
    receipt_number?: string | null;
    payment_method?: string | null;
    transaction_date: string;
    created_by: string;
  };

  const createTransactionMutation = useMutation({
    mutationFn: async (transactionData: TransactionInsert) => {
      const { error } = await supabase.from('transactions').insert([transactionData]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Transaction recorded successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to record transaction', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({ title: 'Transaction deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete transaction', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setType('income');
    setCategory('');
    setAmount('');
    setDescription('');
    setReceiptNumber('');
    setPaymentMethod('Cash');
    setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    createTransactionMutation.mutate({
      type,
      category,
      amount: parseFloat(amount),
      description: description || null,
      receipt_number: receiptNumber || null,
      payment_method: paymentMethod,
      transaction_date: transactionDate,
      created_by: user.id,
    });
  };

  // Kit orders revenue
  const kitOrdersRevenue = kitOrders.reduce((sum, o) => sum + Number(o.price), 0);
  const thisMonthKitOrders = kitOrders.filter(o => {
    const date = parseISO(o.order_date);
    return date >= startOfMonth(new Date()) && date <= endOfMonth(new Date());
  });
  const thisMonthKitRevenue = thisMonthKitOrders.reduce((sum, o) => sum + Number(o.price), 0);

  // Calculate statistics (including kit orders as income)
  const transactionIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalIncome = transactionIncome + kitOrdersRevenue;
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
  const netBalance = totalIncome - totalExpense;

  // This month stats
  const thisMonthStart = startOfMonth(new Date());
  const thisMonthEnd = endOfMonth(new Date());
  const thisMonthTransactions = transactions.filter(t => {
    const date = parseISO(t.transaction_date);
    return date >= thisMonthStart && date <= thisMonthEnd;
  });
  const thisMonthTransactionIncome = thisMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const thisMonthIncome = thisMonthTransactionIncome + thisMonthKitRevenue;
  const thisMonthExpense = thisMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  // Monthly chart data (last 6 months) - including kit orders
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const monthDate = subMonths(new Date(), 5 - i);
    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    const monthTransactions = transactions.filter(t => {
      const date = parseISO(t.transaction_date);
      return date >= monthStart && date <= monthEnd;
    });
    const monthKitOrders = kitOrders.filter(o => {
      const date = parseISO(o.order_date);
      return date >= monthStart && date <= monthEnd;
    });
    const transactionIncomeMonth = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const kitIncomeMonth = monthKitOrders.reduce((sum, o) => sum + Number(o.price), 0);
    return {
      month: format(monthDate, 'MMM'),
      income: transactionIncomeMonth + kitIncomeMonth,
      expense: monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
      kitSales: kitIncomeMonth,
    };
  });

  // Category breakdown for pie chart (including kit sales)
  const categoryData = [
    ...INCOME_CATEGORIES.map(cat => ({
      name: cat,
      value: transactions.filter(t => t.type === 'income' && t.category === cat).reduce((sum, t) => sum + Number(t.amount), 0),
    })),
    { name: 'Kit Sales', value: kitOrdersRevenue },
  ].filter(d => d.value > 0);

  // Create combined transactions list (transactions + kit orders as income)
  type CombinedTransaction = Transaction | {
    id: string;
    type: 'income';
    category: string;
    amount: number;
    description: string;
    transaction_date: string;
    receipt_number: string | null;
    payment_method: string | null;
    isKitOrder: true;
  };

  const kitOrdersAsTransactions: CombinedTransaction[] = kitOrders.map(o => ({
    id: o.id || `kit-${Math.random()}`,
    type: 'income' as const,
    category: 'Kit Sales',
    amount: Number(o.price),
    description: `Kit Order: ${o.kit_name} - ${o.student_name}`,
    transaction_date: o.order_date.split('T')[0],
    receipt_number: null,
    payment_method: 'Pending',
    isKitOrder: true as const,
  }));

  const allTransactions: CombinedTransaction[] = [
    ...transactions,
    ...kitOrdersAsTransactions,
  ].sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

  // Filtered transactions
  const filteredTransactions = allTransactions.filter(t => {
    const matchesSearch = searchTerm === '' || 
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ('receipt_number' in t && t.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  // Export to CSV (including kit orders)
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Description', 'Receipt #', 'Payment Method'];
    const rows = filteredTransactions.map(t => [
      t.transaction_date,
      t.type,
      t.category,
      t.amount,
      t.description || '',
      ('receipt_number' in t ? t.receipt_number : '') || '',
      ('payment_method' in t ? t.payment_method : '') || '',
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Transactions exported to CSV' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Transactions</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Track income, expenses, and fees</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportToCSV} className="gap-2 flex-1 sm:flex-initial">
              <Download className="h-4 w-4" />
              <span className="hidden xs:inline">Export</span> CSV
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2 flex-1 sm:flex-initial">
                  <Plus className="h-4 w-4" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record Transaction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={type === 'income' ? 'default' : 'outline'}
                      onClick={() => { setType('income'); setCategory(''); }}
                      className="gap-2"
                    >
                      <TrendingUp className="h-4 w-4" />
                      Income
                    </Button>
                    <Button
                      type="button"
                      variant={type === 'expense' ? 'destructive' : 'outline'}
                      onClick={() => { setType('expense'); setCategory(''); }}
                      className="gap-2"
                    >
                      <TrendingDown className="h-4 w-4" />
                      Expense
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {(type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map(method => (
                          <SelectItem key={method} value={method}>{method}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="receipt">Receipt Number (Optional)</Label>
                    <Input
                      id="receipt"
                      value={receiptNumber}
                      onChange={(e) => setReceiptNumber(e.target.value)}
                      placeholder="e.g., RCP-001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Transaction details..."
                      rows={2}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={createTransactionMutation.isPending}>
                    Record Transaction
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹{totalIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month: ₹{thisMonthIncome.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">₹{totalExpense.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">This month: ₹{thisMonthExpense.toLocaleString()}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{netBalance.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {netBalance >= 0 ? 'Profit' : 'Loss'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactions.length}</div>
              <p className="text-xs text-muted-foreground">This month: {thisMonthTransactions.length}</p>
            </CardContent>
          </Card>

          {/* Kit Orders Stats */}
          <Card className="border-primary/30 bg-honey-gradient-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kit Revenue</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ₹{kitOrders.reduce((sum, o) => sum + Number(o.price), 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">From {kitOrders.length} orders</p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-honey-gradient-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kits Sold</CardTitle>
              <Package className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kitOrders.length}</div>
              <p className="text-xs text-muted-foreground">
                {kitOrders.filter(o => o.status === 'delivered').length} delivered
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="income" fill="hsl(142, 76%, 36%)" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="hsl(0, 84%, 60%)" name="Expense" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Income by Category</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No income data to display
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Transaction History</CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-[200px]"
                  />
                </div>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as 'all' | 'income' | 'expense')}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading transactions...</p>
            ) : filteredTransactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No transactions found</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Receipt #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.slice(0, 50).map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(parseISO(transaction.transaction_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                            {transaction.type === 'income' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.category}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {transaction.description || '-'}
                        </TableCell>
                        <TableCell>{transaction.payment_method}</TableCell>
                        <TableCell>{transaction.receipt_number || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'income' ? '+' : '-'}₹{Number(transaction.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteTransactionMutation.mutate(transaction.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
