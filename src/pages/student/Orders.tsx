import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Package, ArrowLeft, Clock, CheckCircle, Truck } from 'lucide-react';
import { format } from 'date-fns';

interface KitOrder {
  id: string;
  kit_name: string;
  price: number;
  status: string;
  order_date: string;
  branch: string | null;
  grade: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline' }> = {
  placed: { label: 'Order Placed', icon: <Clock className="h-3 w-3" />, variant: 'secondary' },
  processed: { label: 'Processing', icon: <Package className="h-3 w-3" />, variant: 'default' },
  delivered: { label: 'Delivered', icon: <CheckCircle className="h-3 w-3" />, variant: 'outline' },
};

export default function StudentOrders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<KitOrder[]>([]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('kit_orders')
        .select('id, kit_name, price, status, order_date, branch, grade')
        .eq('student_id', user!.id)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/student/kits')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">My Orders 📋</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Track your study kit orders</p>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">You haven't placed any orders yet</p>
              <Button onClick={() => navigate('/student/kits')}>
                Browse Study Kits
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {orders.map(order => {
              const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG.placed;
              
              return (
                <Card key={order.id}>
                  <CardHeader className="p-4 sm:pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base sm:text-lg truncate">{order.kit_name}</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">
                          Ordered on {format(new Date(order.order_date), 'MMM d, yyyy h:mm a')}
                        </CardDescription>
                      </div>
                      <Badge variant={statusConfig.variant} className="flex items-center gap-1 w-fit shrink-0">
                        {statusConfig.icon}
                        {statusConfig.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                        {order.branch && <span>Branch: {order.branch}</span>}
                        {order.grade && <span>Grade: {order.grade}</span>}
                      </div>
                      <span className="text-lg sm:text-xl font-bold text-primary">₹{order.price}</span>
                    </div>
                    
                    {/* Order Progress */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className={`flex flex-col items-center ${order.status === 'placed' || order.status === 'processed' || order.status === 'delivered' ? 'text-primary' : 'text-muted-foreground'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.status === 'placed' || order.status === 'processed' || order.status === 'delivered' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <span className="text-xs mt-1">Placed</span>
                        </div>
                        <div className={`flex-1 h-1 mx-2 ${order.status === 'processed' || order.status === 'delivered' ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`flex flex-col items-center ${order.status === 'processed' || order.status === 'delivered' ? 'text-primary' : 'text-muted-foreground'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.status === 'processed' || order.status === 'delivered' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <Truck className="h-4 w-4" />
                          </div>
                          <span className="text-xs mt-1">Processing</span>
                        </div>
                        <div className={`flex-1 h-1 mx-2 ${order.status === 'delivered' ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`flex flex-col items-center ${order.status === 'delivered' ? 'text-primary' : 'text-muted-foreground'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${order.status === 'delivered' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <span className="text-xs mt-1">Delivered</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
