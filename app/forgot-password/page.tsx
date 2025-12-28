'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { Loader2, LayoutDashboard, Sun, Moon, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
    const { setTheme, theme } = useTheme();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) {
                toast.error('Erro ao enviar email: ' + error.message);
                return;
            }

            setSubmitted(true);
            toast.success('Email de recuperação enviado!');
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
                    <h2 className="text-xl font-semibold tracking-tight text-text-primary-light">Recuperar Senha</h2>
                    <p className="text-text-muted-light">
                        Digite seu email para receber um link de redefinição
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
                    {submitted ? (
                        <CardContent className="pt-6 space-y-4 text-center">
                            <div className="text-green-600 font-medium">
                                Email enviado com sucesso!
                            </div>
                            <p className="text-text-muted-light text-sm">
                                Verifique sua caixa de entrada (e spam) para encontrar o link de redefinição de senha.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full rounded-full border-border-light text-text-primary-light"
                                onClick={() => setSubmitted(false)}
                            >
                                Tentar outro email
                            </Button>
                        </CardContent>
                    ) : (
                        <form onSubmit={handleResetPassword}>
                            <CardHeader>
                                <CardTitle className="text-center text-lg uppercase tracking-wide text-text-primary-light">Redefinir Senha</CardTitle>
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
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar Link'
                                    )}
                                </Button>
                                <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-text-muted-light hover:text-text-primary-light transition-colors">
                                    <ArrowLeft className="h-4 w-4" />
                                    Voltar para Login
                                </Link>
                            </CardFooter>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
}
