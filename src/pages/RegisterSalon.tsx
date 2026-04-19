import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, Lock, User, Building2, ChevronRight, Store } from 'lucide-react';

export default function RegisterSalon() {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupSalonName, setSignupSalonName] = useState('');

  // Access control check (extra safety though route should be protected)
  const isMaster = user?.email === 'smartbeautyg2@gmail.com';

  if (!isMaster) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Acesso negado. Apenas o usuário mestre pode acessar esta página.</p>
      </div>
    );
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (signupPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'Para sua segurança, use pelo menos 6 caracteres.'
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(signupEmail, signupPassword, signupName, signupSalonName);
    
    if (error) {
      const message = error.message.includes('already registered')
        ? 'Este e-mail já está em uso.'
        : error.message;
      toast({
        variant: 'destructive',
        title: 'Não foi possível cadastrar',
        description: message
      });
    } else {
      toast({ 
        title: 'Conta criada com sucesso!', 
        description: 'Um novo salão foi registrado. Você será desconectado para realizar o primeiro acesso se desejar.' 
      });
      // Supabase auto-signs in the new user, so we'll likely be redirected or session updated.
      // The current user will be signed out.
      navigate('/');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Cadastrar Novo Salão</h1>
        <p className="text-muted-foreground mt-1">Crie uma nova conta de administrador para um novo estabelecimento.</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b border-border/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <Store className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle>Informações de Registro</CardTitle>
              <CardDescription>O novo usuário será o administrador (proprietário) do salão.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 mb-8 flex items-start gap-3">
            <Building2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-primary-foreground/80 leading-relaxed font-medium">
              Nota: Ao concluir este cadastro, sua sessão atual será encerrada para que o novo usuário possa ser autenticado no Supabase.
            </p>
          </div>
          
          <form onSubmit={handleSignup} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Nome do Proprietário</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="signup-name"
                    placeholder="Ex: Maria Silva"
                    className="pl-10 h-11"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-salon">Nome do Salão/Empresa</Label>
                <div className="relative group">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="signup-salon"
                    placeholder="Ex: Belle Beauty"
                    className="pl-10 h-11"
                    value={signupSalonName}
                    onChange={(e) => setSignupSalonName(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email">E-mail de Acesso</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="proprietario@email.com"
                  className="pl-10 h-11"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-password">Senha Temporária</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  className="pl-10 h-11"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>

            <Button type="submit" className="w-full gradient-primary text-white h-12 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all mt-4" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Cadastrando...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Cadastrar Empresa</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
