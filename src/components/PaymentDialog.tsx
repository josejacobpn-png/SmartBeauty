import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Banknote, CreditCard, Smartphone, DollarSign, Percent, User } from 'lucide-react';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  salonId: string;
  professionalId: string;
  professionalName: string;
  servicePrice: number;
  serviceName: string;
  clientName: string;
  onPaymentComplete: () => void;
}

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
  { value: 'credit_card', label: 'Cartão de Crédito', icon: CreditCard },
  { value: 'debit_card', label: 'Cartão de Débito', icon: CreditCard },
  { value: 'pix', label: 'PIX', icon: Smartphone },
];

export default function PaymentDialog({
  open,
  onOpenChange,
  appointmentId,
  salonId,
  professionalId,
  professionalName,
  servicePrice,
  serviceName,
  clientName,
  onPaymentComplete
}: PaymentDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [commissionPercentage, setCommissionPercentage] = useState(0);
  const [formData, setFormData] = useState({
    amount: servicePrice.toString(),
    payment_method: '',
    notes: ''
  });

  useEffect(() => {
    if (open && professionalId) {
      fetchProfessionalCommission();
    }
  }, [open, professionalId]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, amount: servicePrice.toString() }));
  }, [servicePrice]);

  const fetchProfessionalCommission = async () => {
    const { data } = await supabase
      .from('professionals')
      .select('commission_percentage')
      .eq('id', professionalId)
      .maybeSingle();

    if (data) {
      setCommissionPercentage(data.commission_percentage || 0);
    }
  };

  const amount = parseFloat(formData.amount) || 0;
  const commissionAmount = (amount * commissionPercentage) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create payment record
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          appointment_id: appointmentId,
          salon_id: salonId,
          professional_id: professionalId,
          amount: amount,
          payment_method: formData.payment_method,
          commission_percentage: commissionPercentage,
          commission_amount: commissionAmount,
          notes: formData.notes || null
        });

      if (paymentError) throw paymentError;

      // Update appointment payment status
      const { error: appointmentError } = await supabase
        .from('appointments')
        .update({ payment_status: 'paid' })
        .eq('id', appointmentId);

      if (appointmentError) throw appointmentError;

      toast({ title: 'Pagamento registrado com sucesso!' });
      onOpenChange(false);
      onPaymentComplete();
      resetForm();
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Erro ao registrar pagamento', 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: servicePrice.toString(),
      payment_method: '',
      notes: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) resetForm(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-success" />
            Registrar Pagamento
          </DialogTitle>
        </DialogHeader>

        {/* Appointment Info */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{clientName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {serviceName} • {professionalName}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Valor *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de Pagamento *</Label>
            <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o método" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    <div className="flex items-center gap-2">
                      <method.icon className="w-4 h-4" />
                      {method.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Commission Info */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Percent className="w-4 h-4" />
                Comissão ({commissionPercentage}%)
              </span>
              <span className="font-medium text-primary">
                R$ {commissionAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Valor do salão</span>
              <span className="font-medium">
                R$ {(amount - commissionAmount).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações sobre o pagamento..."
              rows={2}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-success hover:bg-success/90 text-success-foreground"
            disabled={loading || !formData.payment_method || !formData.amount}
          >
            {loading ? 'Processando...' : 'Confirmar Pagamento'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
