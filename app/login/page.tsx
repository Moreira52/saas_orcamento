'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Loader2, LayoutDashboard, Eye, EyeOff, Sun, Moon, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const { setTheme, theme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMessage(null);

        try {
            console.log('Tentando login com:', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            console.log('Resposta Supabase:', { data, error });

            if (error) {
                console.error('Erro de login:', error);
                if (error.message.includes('Invalid login credentials')) {
                    setErrorMessage('Senha incorreta');
                } else {
                    toast.error('Erro ao fazer login: ' + error.message);
                }
                setLoading(false);
                return;
            }

            if (data.user) {
                console.log('Login sucesso, redirecionando...');
                toast.success('Login realizado com sucesso!');
                router.refresh(); // Força atualização dos server components/cookies
                router.push('/');
            }
        } catch (error) {
            console.error('Erro try/catch:', error);
            toast.error('Ocorreu um erro inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-light px-4 font-sans text-text-primary-light">
            <div className="w-full max-w-md space-y-8">
                <div className="flex flex-col items-center text-center space-y-2">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-text-primary-light rounded-full flex items-center justify-center text-white">
                            <LayoutDashboard className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary-light uppercase">Budget Box</h1>
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight text-text-primary-light">Bem-vindo de volta</h2>
                    <p className="text-text-muted-light">
                        Entre com suas credenciais para acessar o painel
                    </p>
                </div>

                <div className="absolute top-4 right-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="rounded-full w-10 h-10 bg-card-light border border-border-light text-text-primary-light hover:bg-card-hover-light"
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                </div>

                <Card className="bg-card-light border-border-light rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.05)]">
                    <form onSubmit={handleLogin}>
                        <CardHeader>
                            <CardTitle className="text-center text-lg uppercase tracking-wide text-text-primary-light">Login</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-text-primary-light font-medium">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-12 rounded-xl bg-card-light dark:bg-element-light border-border-light focus:ring-accent-primary focus:border-accent-primary"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password" className="text-text-primary-light font-medium">Senha</Label>
                                    <Link href="/forgot-password" className="text-xs font-semibold text-text-muted-light hover:text-accent-primary transition-colors">
                                        Esqueci a senha
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-12 rounded-xl bg-card-light dark:bg-element-light border-border-light focus:ring-accent-primary focus:border-accent-primary pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light hover:text-text-primary-light focus:outline-none"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 pt-2">
                            {errorMessage && (
                                <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm w-full justify-center">
                                    <AlertCircle className="h-4 w-4" />
                                    {errorMessage}
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full h-12 rounded-full bg-accent-primary text-black font-bold hover:bg-[#B2E030] transition-all shadow-[0_0_15px_rgba(195,245,59,0.3)] text-base"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    'Entrar'
                                )}
                            </Button>
                            <div className="text-center text-sm text-text-muted-light">
                                Não tem uma conta?{' '}
                                <Link href="/register" className="text-text-primary-light font-semibold hover:text-accent-primary underline transition-colors">
                                    Cadastre-se
                                </Link>
                            </div>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div >
    );
}
