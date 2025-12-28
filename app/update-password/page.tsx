'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Loader2, LayoutDashboard, Eye, EyeOff, Sun, Moon } from 'lucide-react';

export default function UpdatePasswordPage() {
    const { setTheme, theme } = useTheme();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Check if we have a session. The password reset link logs the user in.
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                // If no session, maybe the link is invalid or expired
                toast.error('Sessão inválida ou expirada. Tente solicitar a redefinição novamente.');
                router.push('/forgot-password');
            }
        };
        checkSession();
    }, [router]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                toast.error('Erro ao atualizar senha: ' + error.message);
                return;
            }

            toast.success('Senha atualizada com sucesso!');
            router.push('/');
        } catch (error) {
            console.error('Erro:', error);
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
                    <h2 className="text-xl font-semibold tracking-tight text-text-primary-light">Nova Senha</h2>
                    <p className="text-text-muted-light">
                        Defina sua nova senha de acesso
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
                    <form onSubmit={handleUpdatePassword}>
                        <CardHeader>
                            <CardTitle className="text-center text-lg uppercase tracking-wide text-text-primary-light">Atualizar Senha</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-text-primary-light font-medium">Nova Senha</Label>
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
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-text-primary-light font-medium">Confirmar Senha</Label>
                                <Input
                                    id="confirmPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="h-12 rounded-xl bg-card-light dark:bg-element-light border-border-light focus:ring-accent-primary focus:border-accent-primary"
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-4 pt-2">
                            <Button
                                type="submit"
                                className="w-full h-12 rounded-full bg-accent-primary text-black font-bold hover:bg-[#B2E030] transition-all shadow-[0_0_15px_rgba(195,245,59,0.3)] text-base"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Atualizando...
                                    </>
                                ) : (
                                    'Atualizar Senha'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </div>
    );
}
