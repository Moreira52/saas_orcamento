import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Check requester role
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();

        // Only Admins or PMs should see the list of analysts
        if (userData?.role !== 'admin' && userData?.role !== 'pm') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Fetch all users to populate the "Filter by Analyst" dropdown
        // We select all because an Admin might want to filter by another Admin's clients too
        const { data: users, error } = await supabase
            .from('users')
            .select('id, name, email, role')
            .eq('is_active', true)
            .eq('role', 'analyst')
            .order('name');

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: users });
    } catch (error) {
        console.error('Error fetching analysts:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
