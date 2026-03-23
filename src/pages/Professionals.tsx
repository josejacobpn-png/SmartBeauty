import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, UserCheck, Percent, Edit, Trash2 } from 'lucide-react';

interface Specialty {
  id: string;
  name: string;
  is_active: boolean;
}

interface Professional {
  id: string;
  name: string;
  specialty: string | null;
  commission_percentage: number;
  is_active: boolean;
}

export default function Professionals() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    commission_percentage: '0',
    is_active: true
  });

  const canManage = userRole?.role === 'admin';

  useEffect(() => {
    if (profile?.salon_id) {
      fetchProfessionals();
      fetchSpecialties();
    } else if (profile !== null) {
      setLoading(false);
    }
  }, [profile]);

  const fetchProfessionals = async () => {
    if (!profile?.salon_id) return;

    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .order('name');

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar profissionais', description: error.message });
    } else {
      setProfessionals(data || []);
    }
    setLoading(false);
  };

  const fetchSpecialties = async () => {
    if (!profile?.salon_id) return;

    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Erro ao carregar especialidades:', error);
    } else {
      setSpecialties(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.salon_id) return;

    const professionalData = {
      salon_id: profile.salon_id,
      name: formData.name,
      specialty: formData.specialty || null,
      commission_percentage: parseFloat(formData.commission_percentage) || 0,
      is_active: formData.is_active
    };

    let error;
    if (editingProfessional) {
      ({ error } = await supabase
        .from('professionals')
        .update(professionalData)
        .eq('id', editingProfessional.id));
    } else {
      ({ error } = await supabase.from('professionals').insert(professionalData));
    }

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
    } else {
      toast({ title: editingProfessional ? 'Profissional atualizado!' : 'Profissional cadastrado!' });
      setDialogOpen(false);
      resetForm();
      fetchProfessionals();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este profissional?')) return;

    const { error } = await supabase.from('professionals').delete().eq('id', id);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    } else {
      toast({ title: 'Profissional excluído!' });
      fetchProfessionals();
    }
  };

  const toggleActive = async (professional: Professional) => {
    const { error } = await supabase
      .from('professionals')
      .update({ is_active: !professional.is_active })
      .eq('id', professional.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message });
    } else {
      fetchProfessionals();
    }
  };

  const openEditDialog = (professional: Professional) => {
    setEditingProfessional(professional);
    setFormData({
      name: professional.name,
      specialty: professional.specialty || '',
      commission_percentage: professional.commission_percentage.toString(),
      is_active: professional.is_active
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingProfessional(null);
    setFormData({ name: '', specialty: '', commission_percentage: '0', is_active: true });
  };

  const filteredProfessionals = professionals.filter(professional =>
    professional.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    professional.specialty?.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold">Profissionais</h1>
          <p className="text-muted-foreground mt-1">{professionals.length} profissionais cadastrados</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Novo Profissional
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialty">Especialidade</Label>
                  <Select
                    value={formData.specialty}
                    onValueChange={(value) => setFormData({ ...formData, specialty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a especialidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {specialties.map((specialty) => (
                        <SelectItem key={specialty.id} value={specialty.name}>
                          {specialty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="commission">Comissão (%)</Label>
                  <Input
                    id="commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.commission_percentage}
                    onChange={(e) => setFormData({ ...formData, commission_percentage: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Profissional Ativo</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground">
                  {editingProfessional ? 'Salvar Alterações' : 'Cadastrar Profissional'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar profissional..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Professionals Grid */}
      {filteredProfessionals.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <UserCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum profissional encontrado' : 'Nenhum profissional cadastrado'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfessionals.map((professional) => (
            <Card key={professional.id} className={`border-0 shadow-lg card-hover ${!professional.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 gradient-accent rounded-xl flex items-center justify-center text-accent-foreground font-bold">
                      {professional.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{professional.name}</h3>
                      {professional.specialty && (
                        <p className="text-sm text-muted-foreground">{professional.specialty}</p>
                      )}
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(professional)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(professional.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="flex items-center gap-1 text-sm">
                    <Percent className="w-4 h-4 text-primary" />
                    {professional.commission_percentage}% comissão
                  </span>
                  {canManage && (
                    <Switch
                      checked={professional.is_active}
                      onCheckedChange={() => toggleActive(professional)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
