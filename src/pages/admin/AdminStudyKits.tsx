import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Package, ShoppingCart, Loader2, Search, Download } from 'lucide-react';

interface StudyKit {
  id: string;
  name: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  recommended_grade: string | null;
  recommended_level: string | null;
  is_enabled: boolean;
}

interface KitOrder {
  id: string;
  student_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  branch: string | null;
  grade: string | null;
  bee_level: string | null;
  kit_name: string;
  price: number;
  status: string;
  order_date: string;
}

const GRADES = ['Nursery', 'Junior KG', 'Senior KG'];
const LEVELS = ['Small Bee', 'Big Bee'];
const STATUSES = ['placed', 'processed', 'delivered'];

export default function AdminStudyKits() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isKitDialogOpen, setIsKitDialogOpen] = useState(false);
  const [editingKit, setEditingKit] = useState<StudyKit | null>(null);
  const [searchOrders, setSearchOrders] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  
  // Kit form state
  const [kitForm, setKitForm] = useState({
    name: '',
    description: '',
    price: '',
    thumbnail_url: '',
    recommended_grade: '',
    recommended_level: '',
    is_enabled: true,
  });

  // Fetch kits
  const { data: kits = [], isLoading: kitsLoading } = useQuery({
    queryKey: ['admin-study-kits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('study_kits')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as StudyKit[];
    },
  });

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-kit-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kit_orders')
        .select('*')
        .order('order_date', { ascending: false });
      if (error) throw error;
      return data as KitOrder[];
    },
  });

  // Create/Update kit mutation
  const saveMutation = useMutation({
    mutationFn: async (kit: { name: string; description: string | null; price: number; thumbnail_url: string | null; recommended_grade: string | null; recommended_level: string | null; is_enabled: boolean }) => {
      if (editingKit) {
        const { error } = await supabase
          .from('study_kits')
          .update(kit)
          .eq('id', editingKit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('study_kits').insert([kit]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study-kits'] });
      toast({ title: editingKit ? 'Kit updated' : 'Kit created' });
      closeKitDialog();
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete kit mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('study_kits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-study-kits'] });
      toast({ title: 'Kit deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update order status mutation
  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('kit_orders')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-kit-orders'] });
      toast({ title: 'Order status updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const openKitDialog = (kit?: StudyKit) => {
    if (kit) {
      setEditingKit(kit);
      setKitForm({
        name: kit.name,
        description: kit.description || '',
        price: String(kit.price),
        thumbnail_url: kit.thumbnail_url || '',
        recommended_grade: kit.recommended_grade || '',
        recommended_level: kit.recommended_level || '',
        is_enabled: kit.is_enabled,
      });
    } else {
      setEditingKit(null);
      setKitForm({
        name: '',
        description: '',
        price: '',
        thumbnail_url: '',
        recommended_grade: '',
        recommended_level: '',
        is_enabled: true,
      });
    }
    setIsKitDialogOpen(true);
  };

  const closeKitDialog = () => {
    setIsKitDialogOpen(false);
    setEditingKit(null);
  };

  const handleSaveKit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      name: kitForm.name,
      description: kitForm.description || null,
      price: parseFloat(kitForm.price),
      thumbnail_url: kitForm.thumbnail_url || null,
      recommended_grade: kitForm.recommended_grade || null,
      recommended_level: kitForm.recommended_level || null,
      is_enabled: kitForm.is_enabled,
    });
  };

  // Get unique branches from orders
  const branches = [...new Set(orders.map(o => o.branch).filter(Boolean))];

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchOrders === '' ||
      order.student_name.toLowerCase().includes(searchOrders.toLowerCase()) ||
      order.email.toLowerCase().includes(searchOrders.toLowerCase()) ||
      order.kit_name.toLowerCase().includes(searchOrders.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchesGrade = filterGrade === 'all' || order.grade === filterGrade;
    const matchesBranch = filterBranch === 'all' || order.branch === filterBranch;
    return matchesSearch && matchesStatus && matchesGrade && matchesBranch;
  });

  // Stats
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.price), 0);
  const totalKitsSold = orders.length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Order Date', 'Student', 'Email', 'Phone', 'Kit', 'Price', 'Status', 'Branch', 'Grade', 'Level', 'Address'];
    const rows = filteredOrders.map(o => [
      format(new Date(o.order_date), 'yyyy-MM-dd HH:mm'),
      o.student_name,
      o.email,
      o.phone || '',
      o.kit_name,
      o.price,
      o.status,
      o.branch || '',
      o.grade || '',
      o.bee_level || '',
      `${o.city || ''} ${o.state || ''} ${o.pincode || ''}`,
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kit_orders_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Orders exported to CSV' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Study Kits & Orders 📦</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage kits and view student orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">From kit orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Kits Sold</CardTitle>
              <ShoppingCart className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{totalKitsSold}</div>
              <p className="text-xs text-muted-foreground">{deliveredOrders} delivered</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Kits</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{kits.filter(k => k.is_enabled).length}</div>
              <p className="text-xs text-muted-foreground">of {kits.length} total</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="kits">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="kits" className="flex-1 sm:flex-initial">Manage Kits</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 sm:flex-initial">Orders</TabsTrigger>
          </TabsList>

          {/* Kits Tab */}
          <TabsContent value="kits" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={isKitDialogOpen} onOpenChange={setIsKitDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openKitDialog()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Kit
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{editingKit ? 'Edit Kit' : 'Create New Kit'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveKit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={kitForm.name}
                        onChange={(e) => setKitForm({ ...kitForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={kitForm.description}
                        onChange={(e) => setKitForm({ ...kitForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Price (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={kitForm.price}
                          onChange={(e) => setKitForm({ ...kitForm, price: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Thumbnail URL</Label>
                        <Input
                          value={kitForm.thumbnail_url}
                          onChange={(e) => setKitForm({ ...kitForm, thumbnail_url: e.target.value })}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Recommended Grade</Label>
                        <Select
                          value={kitForm.recommended_grade}
                          onValueChange={(v) => setKitForm({ ...kitForm, recommended_grade: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {GRADES.map(g => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Recommended Level</Label>
                        <Select
                          value={kitForm.recommended_level}
                          onValueChange={(v) => setKitForm({ ...kitForm, recommended_level: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {LEVELS.map(l => (
                              <SelectItem key={l} value={l}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={kitForm.is_enabled}
                        onCheckedChange={(c) => setKitForm({ ...kitForm, is_enabled: c })}
                      />
                      <Label>Enabled</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Saving...' : editingKit ? 'Update Kit' : 'Create Kit'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {kitsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kits.map(kit => (
                  <Card key={kit.id} className={!kit.is_enabled ? 'opacity-60' : ''}>
                    <CardHeader className="pb-3">
                      {kit.thumbnail_url ? (
                        <img src={kit.thumbnail_url} alt={kit.name} className="w-full h-32 object-cover rounded-md mb-2" />
                      ) : (
                        <div className="w-full h-32 bg-muted rounded-md mb-2 flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{kit.name}</CardTitle>
                        <Badge variant={kit.is_enabled ? 'default' : 'secondary'}>
                          {kit.is_enabled ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">{kit.description}</p>
                      <div className="flex gap-2 flex-wrap">
                        {kit.recommended_grade && <Badge variant="outline">{kit.recommended_grade}</Badge>}
                        {kit.recommended_level && <Badge variant="outline">{kit.recommended_level}</Badge>}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xl font-bold text-primary">₹{kit.price}</span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openKitDialog(kit)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(kit.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search orders..."
                  value={searchOrders}
                  onChange={(e) => setSearchOrders(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {GRADES.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b} value={b!}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Kit</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="text-sm">
                          {format(new Date(order.order_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.student_name}</p>
                            <p className="text-xs text-muted-foreground">{order.email}</p>
                            {order.phone && <p className="text-xs text-muted-foreground">{order.phone}</p>}
                          </div>
                        </TableCell>
                        <TableCell>{order.kit_name}</TableCell>
                        <TableCell className="font-medium">₹{order.price}</TableCell>
                        <TableCell>{order.branch || '-'}</TableCell>
                        <TableCell>
                          <div>
                            <p>{order.grade || '-'}</p>
                            {order.bee_level && <p className="text-xs text-muted-foreground">{order.bee_level}</p>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={order.status === 'delivered' ? 'outline' : order.status === 'processed' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(v) => updateOrderMutation.mutate({ id: order.id, status: v })}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => (
                                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredOrders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No orders found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
