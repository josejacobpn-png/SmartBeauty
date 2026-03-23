import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Scissors, Sparkles, Mail, Lock, User, Building2, ChevronRight } from 'lucide-react';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupSalonName, setSignupSalonName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Algo deu errado',
        description: error.message === 'Invalid login credentials' 
          ? 'E-mail ou senha incorretos. Verifique seus dados.' 
          : error.message
      });
    } else {
      toast({ 
        title: 'Que bom ver você de volta!', 
        description: 'Estamos carregando suas informações.' 
      });
      navigate('/');
    }
    
    setIsLoading(false);
  };

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
        description: 'Seja bem-vindo ao sistema de gestão do seu salão.' 
      });
      navigate('/');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F8F9FC] relative overflow-hidden font-sans">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 blur-[120px] rounded-full animate-pulse" />
      
      <div className="w-full max-w-md relative z-10 transition-all duration-500 animate-in fade-in zoom-in duration-700">
        
        {/* Auth Card */}
        <Card className="w-full glass border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden">
          <div className="h-2 gradient-primary w-full" />
          
          <CardHeader className="text-center pt-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 gradient-primary rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgb(222,74,181,0.3)] transition-transform hover:rotate-12">
                <Scissors className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                Salão<span className="text-primary">Fácil</span>
              </h1>
            </div>
            <CardTitle className="text-xl font-bold">Boas-vindas</CardTitle>
            <CardDescription>Gerencie seu salão de forma simples e profissional</CardDescription>
          </CardHeader>

          <CardContent className="pb-8">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/30 p-1 rounded-xl">
                  <TabsTrigger value="login" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Entrar</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-lg py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-5 animate-in fade-in duration-500">
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-mail</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="exemplo@email.com"
                          className="pl-10 bg-white/50 border-white/60 focus:bg-white transition-all rounded-xl h-11"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Senha</Label>
                        <button type="button" className="text-xs text-primary hover:underline font-medium">Esqueceu a senha?</button>
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          className="pl-10 bg-white/50 border-white/60 focus:bg-white transition-all rounded-xl h-11"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full gradient-primary text-white h-11 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Entrando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>Entrar no Sistema</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4 animate-in fade-in duration-500">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4 flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-primary-foreground/80 leading-relaxed font-medium">
                      Ao criar sua conta, você será automaticamente cadastrado como administrador de um novo salão.
                    </p>
                  </div>
                  
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Seu Nome</Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            id="signup-name"
                            placeholder="Maria Silva"
                            className="pl-10 bg-white/50 border-white/60 focus:bg-white transition-all rounded-xl h-11"
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-salon">Nome do Salão</Label>
                        <div className="relative group">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                          <Input
                            id="signup-salon"
                            placeholder="Salão da Maria"
                            className="pl-10 bg-white/50 border-white/60 focus:bg-white transition-all rounded-xl h-11"
                            value={signupSalonName}
                            onChange={(e) => setSignupSalonName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">E-mail Profissional</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10 bg-white/50 border-white/60 focus:bg-white transition-all rounded-xl h-11"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha de Acesso</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="Mínimo 6 caracteres"
                          className="pl-10 bg-white/50 border-white/60 focus:bg-white transition-all rounded-xl h-11"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <Button type="submit" className="w-full gradient-primary text-white h-11 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all mt-4" disabled={isLoading}>
                      {isLoading ? 'Configurando salão...' : 'Criar Empresa & Acessar'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
