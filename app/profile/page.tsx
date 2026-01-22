'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { LayoutDashboard, ArrowLeft, Camera, Loader2, Plus, Users, Search, Ban, CheckCircle, Shield, ShieldAlert, User } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { LogOut } from 'lucide-react';
import Image from 'next/image';
import ImageCropper from '@/components/profile/image-cropper';


interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'analyst' | 'pm';
    avatar_url?: string | null;
    birth_date?: string | null;
    squad_id?: string | null;
    is_active?: boolean;
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

    // Admin Team Management State
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loadingTeam, setLoadingTeam] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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

    // Cropper State
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [isCropperOpen, setIsCropperOpen] = useState(false);

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

                // If Admin, fetch all users
                if (u.role === 'admin') {
                    fetchTeamMembers();
                }
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

    const fetchTeamMembers = async () => {
        try {
            setLoadingTeam(true);
            const res = await fetch('/api/admin/users');
            const json = await res.json();
            if (json.success) {
                setAllUsers(json.data);
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar equipe');
        } finally {
            setLoadingTeam(false);
        }
    };

    const toggleUserStatus = async (targetUser: UserProfile) => {
        try {
            // Optimistic Update
            setAllUsers(prev => prev.map(u =>
                u.id === targetUser.id ? { ...u, is_active: !u.is_active } : u
            ));

            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUserId: targetUser.id,
                    is_active: !targetUser.is_active
                })
            });

            if (!res.ok) throw new Error('Falha ao atualizar status');

            toast.success(`Usuário ${!targetUser.is_active ? 'ativado' : 'arquivado'} com sucesso`);
        } catch (error) {
            toast.error('Erro ao alterar status do usuário');
            // Revert on error
            setAllUsers(prev => prev.map(u =>
                u.id === targetUser.id ? { ...u, is_active: targetUser.is_active } : u
            ));
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            setCropImageSrc(reader.result as string || null);
            setIsCropperOpen(true);
            // Clear input so same file can be selected again if needed
            if (fileInputRef.current) fileInputRef.current.value = '';
        });
        reader.readAsDataURL(file);
    };

    const handleCroppedUpload = async (croppedBlob: Blob) => {
        try {
            setUploading(true);
            setIsCropperOpen(false); // Close modal immediately

            const fileExt = 'png'; // cropped image is always png
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedBlob, {
                    contentType: 'image/png'
                });

            if (uploadError) {
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const publicUrl = data.publicUrl;

            // Immediately update user profile in DB
            const updateRes = await fetch('/api/users/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    avatar_url: publicUrl
                })
            });

            if (!updateRes.ok) throw new Error('Falha ao atualizar avatar no perfil');

            setAvatarUrl(publicUrl);

            // Force refresh to update Header and other components
            router.refresh();

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

    const filteredUsers = allUsers.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

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

            <main className="max-w-5xl mx-auto px-6 py-8">
                <Tabs defaultValue="profile" className="w-full">
                    <div className="flex items-center justify-center mb-8">
                        <TabsList className="bg-card-light border border-border-light h-12 p-1 rounded-full shadow-sm">
                            <TabsTrigger value="profile" className="rounded-full px-8 h-10 data-[state=active]:bg-accent-primary data-[state=active]:text-black data-[state=active]:font-bold transition-all">
                                Meu Perfil
                            </TabsTrigger>
                            {user?.role === 'admin' && (
                                <TabsTrigger value="team" className="rounded-full px-8 h-10 data-[state=active]:bg-accent-primary data-[state=active]:text-black data-[state=active]:font-bold transition-all">
                                    Gerenciar Equipe
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </div>

                    <TabsContent value="profile" className="max-w-3xl mx-auto mt-0 focus-visible:outline-none focus:outline-none">
                        <div className="bg-card-light rounded-3xl border border-border-light shadow-sm p-8 md:p-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                                        onChange={handleFileChange}
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
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        value={user?.email}
                                        disabled
                                        className="h-12 rounded-xl bg-element-light text-text-primary-light border-border-light opacity-100 disabled:opacity-100 disabled:cursor-not-allowed"
                                    />
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
                    </TabsContent>

                    {user?.role === 'admin' && (
                        <TabsContent value="team" className="focus-visible:outline-none focus:outline-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-card-light rounded-3xl border border-border-light shadow-sm p-6 md:p-10">
                                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-text-primary-light">Gestão de Equipe</h2>
                                        <p className="text-text-muted-light">Gerencie os acessos e status dos usuários do sistema</p>
                                    </div>
                                    <div className="relative w-full md:w-72">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted-light" />
                                        <Input
                                            placeholder="Buscar usuário..."
                                            className="pl-9 bg-card-light text-text-primary-light border-border-light rounded-xl focus:ring-accent-primary"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {loadingTeam ? (
                                    <div className="py-20 flex justify-center">
                                        <Loader2 className="h-8 w-8 animate-spin text-accent-primary" />
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-border-light overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-element-light text-text-primary-light font-semibold border-b border-border-light">
                                                <tr>
                                                    <th className="px-6 py-4">Usuário</th>
                                                    <th className="px-6 py-4">Função</th>
                                                    <th className="px-6 py-4">Squad</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-light bg-card-light">
                                                {filteredUsers.map((u) => (
                                                    <tr key={u.id} className="hover:bg-card-hover-light transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-element-light overflow-hidden relative border border-border-light flex-shrink-0">
                                                                    {u.avatar_url ? (
                                                                        <Image src={u.avatar_url} alt={u.name} fill className="object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-text-muted-light">
                                                                            {u.name.substring(0, 2).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-text-primary-light">{u.name}</div>
                                                                    <div className="text-xs text-text-muted-light">{u.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant="outline" className={`capitalize font-normal border
                                                                ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                                                                    u.role === 'pm' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                                                        'bg-gray-500/10 text-gray-600 border-gray-500/20'}`}>
                                                                {u.role === 'pm' ? 'Gestor' : u.role}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-text-muted-light">
                                                                {squads.find(s => s.id === u.squad_id)?.name || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
                                                                ${u.is_active !== false
                                                                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                                                    : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                                                                {u.is_active !== false ? 'Ativo' : 'Arquivado'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {user?.id !== u.id && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => toggleUserStatus(u)}
                                                                    className={`${u.is_active !== false ? 'text-text-muted-light hover:text-red-600 hover:bg-red-500/10' : 'text-text-muted-light hover:text-green-600 hover:bg-green-500/10'}`}
                                                                    title={u.is_active !== false ? "Arquivar usuário" : "Reativar usuário"}
                                                                >
                                                                    {u.is_active !== false ? (
                                                                        <>
                                                                            <Ban className="h-4 w-4 mr-2" />
                                                                            Arquivar
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <CheckCircle className="h-4 w-4 mr-2" />
                                                                            Ativar
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            )}
                                                            {user?.id === u.id && (
                                                                <span className="text-xs text-text-muted-light italic">Você</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filteredUsers.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-text-muted-light">
                                                            Nenhum usuário encontrado.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </main>

            <footer className="py-6 text-center text-xs text-gray-400">
                <div className="flex justify-center gap-4">
                    <a href="/privacy" target="_blank" className="hover:text-gray-600 transition-colors">
                        Política de Privacidade
                    </a>
                    <span>•</span>
                    <a href="/terms" target="_blank" className="hover:text-gray-600 transition-colors">
                        Termos de Serviço
                    </a>
                </div>
            </footer>
            <Toaster />

            <ImageCropper
                open={isCropperOpen}
                imageSrc={cropImageSrc}
                onCancel={() => setIsCropperOpen(false)}
                onCropComplete={handleCroppedUpload}
            />
        </div>
    );
}
