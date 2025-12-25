'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { LayoutDashboard, ArrowLeft, Camera, Loader2, Plus, Users } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from 'lucide-react';
import Image from 'next/image';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'analyst' | 'pm';
    avatar_url?: string | null;
    birth_date?: string | null;
    squad_id?: string | null;
}

interface Squad {
    id: string;
    name: string;
}

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [squads, setSquads] = useState<Squad[]>([]);

    // Form States
    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [selectedSquad, setSelectedSquad] = useState<string>('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // New Squad State
    const [newSquadName, setNewSquadName] = useState('');
    const [isAddSquadOpen, setIsAddSquadOpen] = useState(false);
    const [creatingSquad, setCreatingSquad] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // 1. Fetch Squads
            const squadRes = await fetch('/api/squads');
            const squadJson = await squadRes.json();
            if (squadJson.data) setSquads(squadJson.data);

            // 2. Fetch User Profile
            const profileRes = await fetch('/api/users/profile');
            const profileJson = await profileRes.json();

            if (profileJson.data) {
                const u = profileJson.data;
                setUser(u);
                setName(u.name || '');
                setBirthDate(u.birth_date || '');
                setSelectedSquad(u.squad_id || '');
                setAvatarUrl(u.avatar_url || null);
            } else {
                router.push('/login');
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar dados do perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setAvatarUrl(data.publicUrl);
            toast.success('Foto de perfil atualizada!');
        } catch (error: any) {
            toast.error('Erro ao fazer upload da imagem: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await fetch('/api/users/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    birth_date: birthDate || null,
                    squad_id: selectedSquad || null,
                    avatar_url: avatarUrl
                })
            });

            if (!res.ok) throw new Error('Falha ao atualizar');

            toast.success('Perfil atualizado com sucesso!');

            // Refresh User Data locally to ensure sync
            const json = await res.json();
            if (json.data) setUser(json.data);

        } catch (error) {
            toast.error('Erro ao salvar perfil');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateSquad = async () => {
        if (!newSquadName.trim()) return;
        try {
            setCreatingSquad(true);
            const res = await fetch('/api/squads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newSquadName })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erro ao criar squad');
            }

            const json = await res.json();
            setSquads([...squads, json.data]);
            setSelectedSquad(json.data.id);
            setNewSquadName('');
            setIsAddSquadOpen(false);
            toast.success('Squad criado com sucesso!');
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setCreatingSquad(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-bg-light flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-light font-sans text-text-primary-light">
            {/* Header Simplified */}
            <header className="sticky top-0 z-30 pt-6 pb-2 px-6 bg-card-light/90 backdrop-blur-sm border-b border-border-light">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={() => router.push('/')}>
                        <div className="w-10 h-10 bg-text-primary-light rounded-full flex items-center justify-center text-white">
                            <LayoutDashboard className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight text-text-primary-light uppercase hidden sm:block">Budget Box</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="gap-2" onClick={() => router.push('/')}>
                            <ArrowLeft className="h-4 w-4" />
                            Voltar ao Dashboard
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 overflow-hidden border border-gray-300 relative hover:border-accent-primary transition-all">
                                    {avatarUrl ? (
                                        <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-300 text-gray-600 font-bold">
                                            {name ? name.substring(0, 2).toUpperCase() : 'U'}
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 bg-white border border-border-light shadow-lg rounded-xl p-2">
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none text-black">{user?.name}</p>
                                        <p className="text-xs leading-none text-muted-foreground text-gray-500">{user?.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-gray-100" />
                                <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer rounded-lg px-2 py-2" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Sair</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-6 py-12">
                <div className="bg-card-light rounded-3xl border border-border-light shadow-sm p-8 md:p-12">
                    <div className="flex flex-col items-center mb-10">
                        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-100 relative">
                                {avatarUrl ? (
                                    <Image src={avatarUrl} alt="Profile" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                        <Users className="h-12 w-12 opacity-50" />
                                    </div>
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                                    </div>
                                )}
                            </div>
                            <div className="absolute bottom-0 right-0 bg-accent-primary text-black p-2 rounded-full shadow-lg hover:bg-[#B2E030] transition-colors">
                                <Camera className="h-5 w-5" />
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/png, image/jpeg"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                        <h2 className="mt-4 text-2xl font-bold text-text-primary-light">Editar Perfil</h2>
                        <p className="text-text-muted-light">Gerencie suas informações pessoais</p>
                    </div>

                    <div className="space-y-6">
                        {/* Nome Completo */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-12 rounded-xl"
                                placeholder="Seu nome completo"
                            />
                        </div>

                        {/* Data de Nascimento */}
                        <div className="space-y-2">
                            <Label htmlFor="birthdate">Data de Nascimento</Label>
                            <Input
                                id="birthdate"
                                type="date"
                                value={birthDate}
                                onChange={(e) => setBirthDate(e.target.value)}
                                className="h-12 rounded-xl"
                            />
                        </div>

                        {/* Squad */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="squad">Squad</Label>
                                {user?.role === 'admin' && (
                                    <Dialog open={isAddSquadOpen} onOpenChange={setIsAddSquadOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="link" className="h-auto p-0 text-accent-primary hover:text-[#a0c92b] text-xs font-semibold">
                                                + Adicionar Squad
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Criar Novo Squad</DialogTitle>
                                                <DialogDescription>
                                                    Adicione uma nova equipe para que os analistas possam selecioná-la.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4">
                                                <Input
                                                    value={newSquadName}
                                                    onChange={(e) => setNewSquadName(e.target.value)}
                                                    placeholder="Nome do Squad (ex: Squad Alpha)"
                                                />
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsAddSquadOpen(false)}>Cancelar</Button>
                                                <Button onClick={handleCreateSquad} disabled={creatingSquad}>
                                                    {creatingSquad ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                    Criar
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                            <Select value={selectedSquad} onValueChange={setSelectedSquad}>
                                <SelectTrigger className="h-12 rounded-xl">
                                    <SelectValue placeholder="Selecione seu squad" />
                                </SelectTrigger>
                                <SelectContent>
                                    {squads.map(squad => (
                                        <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>
                                    ))}
                                    {squads.length === 0 && (
                                        <div className="p-2 text-sm text-center text-gray-500">Nenhum squad disponível</div>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Email (Read Only) */}
                        <div className="space-y-2 opacity-60">
                            <Label>Email</Label>
                            <Input value={user?.email} disabled className="h-12 rounded-xl bg-gray-50" />
                        </div>

                        <div className="pt-6">
                            <Button
                                className="w-full h-12 rounded-xl bg-accent-primary text-black font-bold hover:bg-[#B2E030] text-lg shadow-lg shadow-lime-200/50"
                                onClick={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Salvando...
                                    </>
                                ) : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
            <Toaster />
        </div>
    );
}
