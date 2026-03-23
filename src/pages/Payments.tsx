import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  FileDown, 
  Search, 
  DollarSign, 
  Percent, 
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Calendar
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ITEMS_PER_PAGE = 20;

const paymentMethods = [
  { value: 'all', label: 'Todos os Métodos' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Crédito' },
  { value: 'debit_card', label: 'Débito' },
  { value: 'pix', label: 'PIX' },
];

const getPaymentMethodIcon = (method: string) => {
  switch (method) {
    case 'pix':
      return <Smartphone className="w-4 h-4" />;
    case 'credit_card':
    case 'debit_card':
      return <CreditCard className="w-4 h-4" />;
    case 'cash':
      return <Banknote className="w-4 h-4" />;
    default:
      return <DollarSign className="w-4 h-4" />;
  }
};

const translatePaymentMethod = (method: string) => {
  const translations: Record<string, string> = {
    cash: 'Dinheiro',
    credit_card: 'Cartão de Crédito',
    debit_card: 'Cartão de Débito',
    pix: 'PIX',
  };
  return translations[method] || method;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">Pago</Badge>;
    case 'pending':
      return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600">Pendente</Badge>;
    case 'refunded':
      return <Badge variant="destructive">Estornado</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Payments() {
  const { profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedProfessional, setSelectedProfessional] = useState('all');
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch professionals for filter
  const { data: professionals = [] } = useQuery({
    queryKey: ['professionals', profile?.salon_id],
    queryFn: async () => {
      if (!profile?.salon_id) return [];
      const { data, error } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('salon_id', profile.salon_id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.salon_id,
  });

  // Fetch payments with related data
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', profile?.salon_id, startDate, endDate],
    queryFn: async () => {
      if (!profile?.salon_id) return [];
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          appointments!inner(
            start_time,
            clients(name),
            services(name, price),
            professionals(name)
          )
        `)
        .eq('salon_id', profile.salon_id)
        .gte('paid_at', `${startDate}T00:00:00`)
        .lte('paid_at', `${endDate}T23:59:59`)
        .order('paid_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.salon_id,
  });

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesSearch = searchTerm === '' || 
        payment.appointments?.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.appointments?.services?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMethod = selectedMethod === 'all' || payment.payment_method === selectedMethod;
      
      const matchesProfessional = selectedProfessional === 'all' || 
        payment.professional_id === selectedProfessional;
      
      return matchesSearch && matchesMethod && matchesProfessional;
    });
  }, [payments, searchTerm, selectedMethod, selectedProfessional]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMethod, selectedProfessional, startDate, endDate]);

  // Totals
  const totals = useMemo(() => {
    return filteredPayments.reduce(
      (acc, payment) => ({
        amount: acc.amount + Number(payment.amount || 0),
        commission: acc.commission + Number(payment.commission_amount || 0),
        count: acc.count + 1,
      }),
      { amount: 0, commission: 0, count: 0 }
    );
  }, [filteredPayments]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(139, 92, 246);
    doc.text('Relatório de Pagamentos', 14, 22);
    
    // Period info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`,
      14,
      32
    );
    doc.text(`Total de registros: ${filteredPayments.length}`, 14, 38);
    
    // Summary cards
    doc.setFillColor(139, 92, 246);
    doc.roundedRect(14, 44, 55, 20, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('Total do Período', 18, 52);
    doc.setFontSize(12);
    doc.text(formatCurrency(totals.amount), 18, 60);
    
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(75, 44, 55, 20, 2, 2, 'F');
    doc.setFontSize(8);
    doc.text('Total Comissões', 79, 52);
    doc.setFontSize(12);
    doc.text(formatCurrency(totals.commission), 79, 60);
    
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(136, 44, 55, 20, 2, 2, 'F');
    doc.setFontSize(8);
    doc.text('Qtd. Pagamentos', 140, 52);
    doc.setFontSize(12);
    doc.text(String(totals.count), 140, 60);
    
    // Table
    autoTable(doc, {
      startY: 70,
      head: [['Data/Hora', 'Cliente', 'Serviço', 'Profissional', 'Método', 'Valor', 'Comissão', 'Status']],
      body: filteredPayments.map(payment => [
        payment.paid_at ? format(parseISO(payment.paid_at), 'dd/MM/yy HH:mm') : '-',
        payment.appointments?.clients?.name || '-',
        payment.appointments?.services?.name || '-',
        payment.appointments?.professionals?.name || '-',
        translatePaymentMethod(payment.payment_method),
        formatCurrency(Number(payment.amount || 0)),
        formatCurrency(Number(payment.commission_amount || 0)),
        payment.status === 'completed' ? 'Pago' : payment.status === 'pending' ? 'Pendente' : payment.status,
      ]),
      styles: { 
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: { 
        fillColor: [139, 92, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      footStyles: {
        fillColor: [139, 92, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} - Página ${i} de ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }
    
    doc.save(`pagamentos-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Histórico de Pagamentos</h1>
          <p className="text-muted-foreground">
            {filteredPayments.length} pagamento{filteredPayments.length !== 1 ? 's' : ''} encontrado{filteredPayments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleExportPDF} disabled={filteredPayments.length === 0}>
          <FileDown className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Inicial
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Final
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Método</label>
              <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profissional</label>
              <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {professionals.map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cliente ou serviço..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totals.amount)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Total Comissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.commission)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              Quantidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">{totals.count}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading && !!profile?.salon_id ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !profile?.salon_id && !isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum salão vinculado ao seu perfil</p>
              <p className="text-sm">Contate o administrador para vincular seu perfil a um salão</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pagamento encontrado</p>
              <p className="text-sm">Ajuste os filtros para ver mais resultados</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">
                          {payment.paid_at
                            ? format(parseISO(payment.paid_at), "dd/MM/yy HH:mm", { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {payment.appointments?.clients?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {payment.appointments?.services?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {payment.appointments?.professionals?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getPaymentMethodIcon(payment.payment_method)}
                            <span>{translatePaymentMethod(payment.payment_method)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(payment.amount || 0))}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(Number(payment.commission_amount || 0))}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(payment.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center py-4 border-t">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setCurrentPage(pageNum)}
                              isActive={currentPage === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
