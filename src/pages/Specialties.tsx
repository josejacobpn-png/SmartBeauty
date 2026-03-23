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
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Sparkles, Edit, Trash2 } from 'lucide-react';

interface Specialty {
  id: string;
  name: string;
  is_active: boolean;
}

export default function Specialties() {
  const { profile, userRole } = useAuth();
  const { toast } = useToast();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    is_active: true
  });

  const canManage = userRole?.role === 'admin';

  useEffect(() => {
    if (profile?.salon_id) {
      fetchSpecialties();
    } else if (profile !== null) {
      setLoading(false);
    }
  }, [profile]);

  const fetchSpecialties = async () => {
    if (!profile?.salon_id) return;

    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .eq('salon_id', profile.salon_id)
      .order('name');

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar especialidades', description: error.message });
    } else {
      setSpecialties(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.salon_id) return;

    const specialtyData = {
      salon_id: profile.salon_id,
      name: formData.name,
      is_active: formData.is_active
    };

    let error;
    if (editingSpecialty) {
      ({ error } = await supabase
        .from('specialties')
        .update({ name: formData.name, is_active: formData.is_active })
        .eq('id', editingSpecialty.id));
    } else {
      ({ error } = await supabase.from('specialties').insert(specialtyData));
    }

    if (error) {
      if (error.code === '23505') {
        toast({ variant: 'destructive', title: 'Erro', description: 'Já existe uma especialidade com este nome' });
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message });
      }
    } else {
      toast({ title: editingSpecialty ? 'Especialidade atualizada!' : 'Especialidade cadastrada!' });
      setDialogOpen(false);
      resetForm();
      fetchSpecialties();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta especialidade?')) return;

    const { error } = await supabase.from('specialties').delete().eq('id', id);
    
    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    } else {
      toast({ title: 'Especialidade excluída!' });
      fetchSpecialties();
    }
  };

  const toggleActive = async (specialty: Specialty) => {
    const { error } = await supabase
      .from('specialties')
      .update({ is_active: !specialty.is_active })
      .eq('id', specialty.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: error.message });
    } else {
      fetchSpecialties();
    }
  };

  const openEditDialog = (specialty: Specialty) => {
    setEditingSpecialty(specialty);
    setFormData({
      name: specialty.name,
      is_active: specialty.is_active
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingSpecialty(null);
    setFormData({ name: '', is_active: true });
  };

  const filteredSpecialties = specialties.filter(specialty =>
    specialty.name.toLowerCase().includes(searchTerm.toLowerCase())
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
          <h1 className="text-3xl font-bold">Especialidades</h1>
          <p className="text-muted-foreground mt-1">{specialties.length} especialidades cadastradas</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                Nova Especialidade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingSpecialty ? 'Editar Especialidade' : 'Nova Especialidade'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Cabelereiro, Barbeiro, Manicure"
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">Especialidade Ativa</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                <Button type="submit" className="w-full gradient-primary text-primary-foreground">
                  {editingSpecialty ? 'Salvar Alterações' : 'Cadastrar Especialidade'}
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
          placeholder="Buscar especialidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Specialties Grid */}
      {filteredSpecialties.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhuma especialidade encontrada' : 'Nenhuma especialidade cadastrada'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpecialties.map((specialty) => (
            <Card key={specialty.id} className={`border-0 shadow-lg card-hover ${!specialty.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <h3 className="font-semibold">{specialty.name}</h3>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(specialty)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(specialty.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={specialty.is_active}
                        onCheckedChange={() => toggleActive(specialty)}
                      />
                    </div>
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
