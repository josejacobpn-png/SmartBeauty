import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsLoading(true);

    try {
      const validatedData = loginSchema.parse(loginData);

      const { error } = await signIn(validatedData.email, validatedData.password);

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            variant: "destructive",
            title: "Algo deu errado",
            description: "Email ou senha incorretos",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Algo deu errado",
            description: error.message,
          });
        }
        return;
      }

      toast({ 
        title: "Que bom ver você de volta!", 
        description: "Estamos carregando suas informações.",
      });
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(fieldErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex flex-col items-center text-center">
        <img 
          src="/favicon.svg" 
          alt="Ícone Sistema" 
          className="h-24 w-auto mb-4 object-contain"
        />
        <p className="text-primary font-bold uppercase tracking-widest text-xs opacity-90">
          SMARTBEAUTY - SISTEMA PARA SALÕES
        </p>
      </div>

      <Card className="w-full max-w-md border-t-4 border-t-primary shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Acesso ao Sistema</CardTitle>
          <CardDescription>
            Entre com suas credenciais para gerenciar sua empresa.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="login-email" className="text-sm font-medium leading-none text-slate-600">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="Ex: admin@empresa.com.br"
                value={loginData.email}
                onChange={(e) =>
                  setLoginData({ ...loginData, email: e.target.value })
                }
                disabled={isLoading}
                className="h-11 focus:ring-primary"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="login-password" className="text-sm font-medium leading-none text-slate-600">
                Senha
              </Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={loginData.password}
                onChange={(e) =>
                  setLoginData({ ...loginData, password: e.target.value })
                }
                disabled={isLoading}
                className="h-11 focus:ring-primary"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button type="submit" className="w-full h-11 font-bold" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                "Entrar no Sistema"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <div className="mt-8 flex flex-col items-center">
        <a href="https://www.g2autodev.com.br" target="_blank" rel="noopener noreferrer">
          <img 
            src="/g2-logo.png" 
            alt="G2 Sistemas" 
            className="max-w-[200px] h-auto object-contain opacity-60 transition-opacity hover:opacity-100 duration-300"
          />
        </a>
      </div>
    </div>
  );
}
