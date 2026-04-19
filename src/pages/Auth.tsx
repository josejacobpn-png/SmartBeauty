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
                Smart<span className="text-primary">Beauty</span>
              </h1>
            </div>
            <CardTitle className="text-xl font-bold">Boas-vindas</CardTitle>
            <CardDescription>Gerencie seu salão de forma simples e profissional</CardDescription>
          </CardHeader>

          <CardContent className="pb-8">
            <div className="space-y-5 animate-in fade-in duration-500">
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
            </div>
          </CardContent>
      </Card>
      </div>
    </div>
  );
}
