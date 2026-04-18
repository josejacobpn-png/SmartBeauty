import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PaymentDialog from '@/components/PaymentDialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, ChevronLeft, ChevronRight, Clock, User, Scissors, Zap, DollarSign, CheckCircle } from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  payment_status: string;
  notes: string | null;
  is_walk_in: boolean;
  clients: { id: string; name: string } | null;
  services: { id: string; name: string; duration_minutes: number; price: number } | null;
  professionals: { id: string; name: string } | null;
}

interface Client { id: string; name: string; }
interface Service { id: string; name: string; duration_minutes: number; price: number; }
interface Professional { id: string; name: string; }

export default function Agenda() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    professional_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00'
  });

  const [walkInFormData, setWalkInFormData] = useState({
    client_id: '',
    service_id: '',
    professional_id: ''
  });

  const canManage = userRole?.role === 'admin' || userRole?.role === 'receptionist';

  useEffect(() => {
    if (profile?.salon_id) {
      fetchData();
    } else if (profile !== null) {
      setLoading(false);
    }
  }, [profile, selectedDate]);

  const fetchData = async () => {
    if (!profile?.salon_id) return;

    const start = startOfDay(selectedDate).toISOString();
    const end = endOfDay(selectedDate).toISOString();

    const [appointmentsRes, clientsRes, servicesRes, professionalsRes] = await Promise.all([
      supabase
        .from('appointments')
        .select(`
          id, start_time, end_time, status, payment_status, notes, is_walk_in,
          clients (id, name),
          services (id, name, duration_minutes, price),
          professionals (id, name)
        `)
        .eq('salon_id', profile.salon_id)
        .neq('payment_status', 'paid')
        .gte('start_time', start)
        .lte('start_time', end)
        .order('start_time'),
      supabase.from('clients').select('id, name').eq('salon_id', profile.salon_id).order('name'),
      supabase.from('services').select('id, name, duration_minutes, price').eq('salon_id', profile.salon_id).eq('is_active', true),
      supabase.from('professionals').select('id, name').eq('salon_id', profile.salon_id).eq('is_active', true)
    ]);

    setAppointments(appointmentsRes.data as Appointment[] || []);
    setClients(clientsRes.data || []);
    setServices(servicesRes.data || []);
    setProfessionals(professionalsRes.data || []);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.salon_id) return;

    const service = services.find(s => s.id === formData.service_id);
    if (!service) return;

    const startTime = new Date(`${formData.date}T${formData.time}`);
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);

    const appointmentData = {
      salon_id: profile.salon_id,
      client_id: formData.client_id,
      service_id: formData.service_id,
      professional_id: formData.professional_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'scheduled'
    };

    const { error } = await supabase.from('appointments').insert(appointmentData);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao agendar', description: error.message });
    } else {
      toast({ title: 'Agendamento criado!' });
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const updateData: any = { status };
    
    // If starting or completing, update times to now to reflect actual service time
    if (status === 'in_progress' || status === 'completed') {
      const appointment = appointments.find(a => a.id === id);
      if (appointment && appointment.services) {
        const now = new Date();
        updateData.start_time = now.toISOString();
        updateData.end_time = new Date(now.getTime() + appointment.services.duration_minutes * 60000).toISOString();
      }
    }

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message });
    } else {
      fetchData();
    }
  };

  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.salon_id) return;

    const service = services.find(s => s.id === walkInFormData.service_id);
    if (!service) return;

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000);

    const appointmentData = {
      salon_id: profile.salon_id,
      client_id: walkInFormData.client_id,
      service_id: walkInFormData.service_id,
      professional_id: walkInFormData.professional_id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'in_progress',
      is_walk_in: true
    };

    const { error } = await supabase.from('appointments').insert(appointmentData);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao criar atendimento', description: error.message });
    } else {
      toast({ title: 'Atendimento iniciado!' });
      setWalkInDialogOpen(false);
      resetWalkInForm();
      fetchData();
    }
  };

  const openPaymentDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setPaymentDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      service_id: '',
      professional_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00'
    });
  };

  const resetWalkInForm = () => {
    setWalkInFormData({
      client_id: '',
      service_id: '',
      professional_id: ''
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'border-l-success bg-success/10';
      case 'scheduled': return 'border-l-warning bg-warning/10';
      case 'in_progress': return 'border-l-info bg-info/10';
      case 'completed': return 'border-l-primary bg-primary/10';
      case 'cancelled': return 'border-l-destructive bg-destructive/10';
      default: return 'border-l-muted';
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-success/20 text-success';
      case 'scheduled': return 'bg-warning/20 text-warning';
      case 'in_progress': return 'bg-info/20 text-info';
      case 'completed': return 'bg-primary/20 text-primary';
      case 'cancelled': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    if (paymentStatus === 'paid') {
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/20 text-success">
          <CheckCircle className="w-3 h-3" />
          Pago
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/20 text-warning">
        <DollarSign className="w-3 h-3" />
        Pendente
      </span>
    );
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => 
    addDays(startOfWeek(selectedDate, { weekStartsOn: 0 }), i)
  );

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Agenda</h1>
          <p className="text-muted-foreground mt-1">
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Dialog open={walkInDialogOpen} onOpenChange={(open) => { setWalkInDialogOpen(open); if (!open) resetWalkInForm(); }}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Atendimento Rápido
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-info" />
                    Atendimento Rápido (Em-Atendimento)
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleWalkInSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select value={walkInFormData.client_id} onValueChange={(value) => setWalkInFormData({ ...walkInFormData, client_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Serviço *</Label>
                    <Select value={walkInFormData.service_id} onValueChange={(value) => setWalkInFormData({ ...walkInFormData, service_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} ({service.duration_minutes} min)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Profissional *</Label>
                    <Select value={walkInFormData.professional_id} onValueChange={(value) => setWalkInFormData({ ...walkInFormData, professional_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione um profissional" /></SelectTrigger>
                      <SelectContent>
                        {professionals.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id}>{professional.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 rounded-lg bg-info/10 text-info text-sm">
                    <Clock className="w-4 h-4 inline mr-2" />
                    O atendimento será iniciado agora ({format(new Date(), 'HH:mm')})
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-info hover:bg-info/90 text-info-foreground"
                    disabled={!walkInFormData.client_id || !walkInFormData.service_id || !walkInFormData.professional_id}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Iniciar Atendimento
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-primary-foreground">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Agendamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Agendamento</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Serviço *</Label>
                    <Select value={formData.service_id} onValueChange={(value) => setFormData({ ...formData, service_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione um serviço" /></SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} ({service.duration_minutes} min)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Profissional *</Label>
                    <Select value={formData.professional_id} onValueChange={(value) => setFormData({ ...formData, professional_id: value })}>
                      <SelectTrigger><SelectValue placeholder="Selecione um profissional" /></SelectTrigger>
                      <SelectContent>
                        {professionals.map((professional) => (
                          <SelectItem key={professional.id} value={professional.id}>{professional.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Data *</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Horário *</Label>
                      <Input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full gradient-primary text-primary-foreground"
                    disabled={!formData.client_id || !formData.service_id || !formData.professional_id}
                  >
                    Criar Agendamento
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      {/* Week Navigation */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold">
              {format(weekDays[0], "d MMM", { locale: ptBR })} - {format(weekDays[6], "d MMM yyyy", { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
            <div className="grid grid-cols-7 gap-1.5 min-w-[320px]">
              {weekDays.map((day) => (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`p-2 sm:p-3 rounded-xl text-center transition-all ${
                    isSameDay(day, selectedDate)
                      ? 'gradient-primary text-primary-foreground shadow-lg'
                      : 'hover:bg-muted'
                  }`}
                >
                  <div className="text-[10px] sm:text-xs opacity-80 uppercase font-medium">{format(day, 'EEE', { locale: ptBR })}</div>
                  <div className="text-base sm:text-lg font-bold">{format(day, 'd')}</div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointments List */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Agendamentos do Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum agendamento para este dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`p-4 rounded-xl border-l-4 ${getStatusColor(appointment.status)} transition-all`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        {appointment.is_walk_in ? (
                          <div className="w-12 h-12 bg-info/20 rounded-xl flex items-center justify-center">
                            <Zap className="w-6 h-6 text-info" />
                          </div>
                        ) : (
                          <>
                            <div className="text-lg font-bold">{format(new Date(appointment.start_time), 'HH:mm')}</div>
                            <div className="text-xs text-muted-foreground">{format(new Date(appointment.end_time), 'HH:mm')}</div>
                          </>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{appointment.clients?.name}</span>
                          {appointment.is_walk_in && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-info/20 text-info">
                              Em-Atendimento
                            </span>
                          )}
                          {appointment.status === 'completed' && getPaymentBadge(appointment.payment_status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Scissors className="w-3 h-3" />
                            {appointment.services?.name}
                          </span>
                          <span>• {appointment.professionals?.name}</span>
                          {appointment.services?.price && (
                            <span className="font-medium text-foreground">
                              R$ {Number(appointment.services.price).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                      
                      {/* Payment Button for completed appointments */}
                      {canManage && appointment.status === 'completed' && appointment.payment_status !== 'paid' && (
                        <Button 
                          size="sm" 
                          className="bg-success hover:bg-success/90 text-success-foreground gap-1"
                          onClick={() => openPaymentDialog(appointment)}
                        >
                          <DollarSign className="w-4 h-4" />
                          Pagamento
                        </Button>
                      )}

                      {canManage && appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                        <Select onValueChange={(value) => updateStatus(appointment.id, value)}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Ação" />
                          </SelectTrigger>
                          <SelectContent>
                            {appointment.status === 'scheduled' && (
                              <SelectItem value="confirmed">Confirmar</SelectItem>
                            )}
                            {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                              <SelectItem value="in_progress">Iniciar</SelectItem>
                            )}
                            {appointment.status === 'in_progress' && (
                              <SelectItem value="completed">Finalizar</SelectItem>
                            )}
                            <SelectItem value="cancelled">Cancelar</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      {selectedAppointment && profile?.salon_id && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          appointmentId={selectedAppointment.id}
          salonId={profile.salon_id}
          professionalId={selectedAppointment.professionals?.id || ''}
          professionalName={selectedAppointment.professionals?.name || ''}
          servicePrice={selectedAppointment.services?.price || 0}
          serviceName={selectedAppointment.services?.name || ''}
          clientName={selectedAppointment.clients?.name || ''}
          onPaymentComplete={fetchData}
        />
      )}
    </div>
  );
}
