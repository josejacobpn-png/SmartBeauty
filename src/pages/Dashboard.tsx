import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Users, TrendingUp, Clock, Zap, DollarSign, Banknote, CreditCard, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  todayAppointments: number;
  currentlyInService: number;
  totalClients: number;
  todayCompleted: number;
  todayRevenue: number;
  pendingPayments: number;
}

interface PaymentsByMethod {
  cash: number;
  credit_card: number;
  debit_card: number;
  pix: number;
}

interface Appointment {
  id: string;
  start_time: string;
  status: string;
  clients: { name: string } | null;
  services: { name: string } | null;
  professionals: { name: string } | null;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayAppointments: 0,
    currentlyInService: 0,
    totalClients: 0,
    todayCompleted: 0,
    todayRevenue: 0,
    pendingPayments: 0
  });
  const [paymentsByMethod, setPaymentsByMethod] = useState<PaymentsByMethod>({
    cash: 0,
    credit_card: 0,
    debit_card: 0,
    pix: 0
  });
  const [nextAppointments, setNextAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.salon_id) {
      fetchDashboardData();
    } else if (profile !== null) {
      // Profile loaded but no salon_id - stop loading
      setLoading(false);
    }
  }, [profile]);

  const fetchDashboardData = async () => {
    if (!profile?.salon_id) return;

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    try {
      const [
        appointmentsRes, 
        walkInsRes, 
        clientsRes, 
        completedRes, 
        nextRes,
        paymentsRes,
        pendingRes
      ] = await Promise.all([
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .eq('salon_id', profile.salon_id)
          .eq('is_walk_in', false)
          .neq('payment_status', 'paid')
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay),
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .eq('salon_id', profile.salon_id)
          .eq('status', 'in_progress'),
        supabase
          .from('clients')
          .select('id', { count: 'exact' })
          .eq('salon_id', profile.salon_id),
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .eq('salon_id', profile.salon_id)
          .eq('status', 'completed')
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay),
        supabase
          .from('appointments')
          .select(`
            id,
            start_time,
            status,
            is_walk_in,
            clients (name),
            services (name),
            professionals (name)
          `)
          .eq('salon_id', profile.salon_id)
          .neq('payment_status', 'paid')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(5),
        supabase
          .from('payments')
          .select('amount, payment_method')
          .eq('salon_id', profile.salon_id)
          .eq('status', 'completed')
          .gte('paid_at', startOfDay)
          .lte('paid_at', endOfDay),
        supabase
          .from('appointments')
          .select('id', { count: 'exact' })
          .eq('salon_id', profile.salon_id)
          .eq('status', 'completed')
          .eq('payment_status', 'pending')
      ]);

      // Calculate revenue and payments by method
      let totalRevenue = 0;
      const methodTotals: PaymentsByMethod = { cash: 0, credit_card: 0, debit_card: 0, pix: 0 };
      
      if (paymentsRes.data) {
        paymentsRes.data.forEach((payment: { amount: number; payment_method: string }) => {
          totalRevenue += Number(payment.amount);
          const method = payment.payment_method as keyof PaymentsByMethod;
          if (method in methodTotals) {
            methodTotals[method] += Number(payment.amount);
          }
        });
      }

      setStats({
        todayAppointments: appointmentsRes.count || 0,
        currentlyInService: walkInsRes.count || 0,
        totalClients: clientsRes.count || 0,
        todayCompleted: completedRes.count || 0,
        todayRevenue: totalRevenue,
        pendingPayments: pendingRes.count || 0
      });

      setPaymentsByMethod(methodTotals);
      setNextAppointments(nextRes.data as Appointment[] || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Faturamento Hoje',
      value: `R$ ${stats.todayRevenue.toFixed(2)}`,
      icon: DollarSign,
      gradient: 'bg-success'
    },
    {
      title: 'Agendamentos Hoje',
      value: stats.todayAppointments,
      icon: Calendar,
      gradient: 'gradient-primary'
    },
    {
      title: 'Em-Atendimento Agora',
      value: stats.currentlyInService,
      icon: Zap,
      gradient: 'bg-info'
    },
    {
      title: 'Atendidos Hoje',
      value: stats.todayCompleted,
      icon: TrendingUp,
      gradient: 'gradient-secondary'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success/20 text-success';
      case 'scheduled': return 'bg-warning/20 text-warning';
      case 'in_progress': return 'bg-info/20 text-info';
      case 'completed': return 'bg-primary/20 text-primary';
      case 'cancelled': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'scheduled': return 'Agendado';
      case 'in_progress': return 'Em Atendimento';
      case 'completed': return 'Atendido';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo de volta, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="border-0 shadow-lg card-hover overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`w-14 h-14 ${stat.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                  <stat.icon className="w-7 h-7 text-primary-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payments by Method */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              Pagamentos por Método
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-success/20 rounded-xl flex items-center justify-center">
                  <Banknote className="w-5 h-5 text-success" />
                </div>
                <span className="font-medium">Dinheiro</span>
              </div>
              <span className="font-bold">R$ {paymentsByMethod.cash.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <span className="font-medium">Cartão de Crédito</span>
              </div>
              <span className="font-bold">R$ {paymentsByMethod.credit_card.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-info/20 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-info" />
                </div>
                <span className="font-medium">Cartão de Débito</span>
              </div>
              <span className="font-bold">R$ {paymentsByMethod.debit_card.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary/20 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-secondary-foreground" />
                </div>
                <span className="font-medium">PIX</span>
              </div>
              <span className="font-bold">R$ {paymentsByMethod.pix.toFixed(2)}</span>
            </div>

            {stats.pendingPayments > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                <span className="text-warning font-medium">Pagamentos Pendentes</span>
                <span className="font-bold text-warning">{stats.pendingPayments}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Appointments */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Próximos Atendimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum agendamento próximo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nextAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-12 gradient-primary rounded-xl flex flex-col items-center justify-center text-primary-foreground px-1">
                        <span className="text-[10px] leading-tight opacity-90">{format(new Date(appointment.start_time), 'dd/MM')}</span>
                        <span className="font-bold leading-none">{format(new Date(appointment.start_time), 'HH:mm')}</span>
                      </div>
                      <div>
                        <p className="font-medium">{appointment.clients?.name || 'Cliente'}</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.services?.name} • {appointment.professionals?.name}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {getStatusLabel(appointment.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 gradient-secondary rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Clientes</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
