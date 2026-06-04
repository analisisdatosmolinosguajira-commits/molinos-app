import { supabase } from './supabase.js';

// ─── Helpers ────────────────────────────────────────────────

/**
 * Parse a date string (YYYY-MM-DD) or Date to a LOCAL Date (avoids UTC midnight shift)
 */
export function parseLocal(d) {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [y, m, day] = d.split('-').map(Number);
        return new Date(y, m - 1, day);
    }
    return new Date(d);
}

/**
 * Format a Date to YYYY-MM-DD string in local time
 */
export function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Get the Monday (ISO week start) for a given date
 */
export function getMonday(d) {
    const date = parseLocal(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return toDateStr(date);
}

/**
 * Generate ISO calendar weeks for a date range
 */
export function getCalendarWeeks(startDate, endDate) {
    const weeks = [];
    let current = parseLocal(getMonday(startDate));
    const end = parseLocal(endDate);

    while (current <= end) {
        const monday = new Date(current);
        const sunday = new Date(current);
        sunday.setDate(sunday.getDate() + 6);

        const weekNum = getISOWeek(monday);
        weeks.push({
            weekStart: toDateStr(monday),
            weekEnd: toDateStr(sunday),
            weekNumber: weekNum,
            year: monday.getFullYear(),
            label: `Sem ${weekNum} — ${formatDateShort(monday)} al ${formatDateShort(sunday)}`
        });

        current.setDate(current.getDate() + 7);
    }
    return weeks;
}

function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatDateShort(d) {
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── CIEA Plan Service ──────────────────────────────────────
export const CIEAPlanService = {

    // ═══ PROJECTS ═══════════════════════════════════════════
    async getProjects() {
        const { data, error } = await supabase
            .from('ciea_project')
            .select(`
                *,
                responsible:person!ciea_project_responsible_person_id_fkey (
                    person_id, first_name, last_name
                )
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(p => ({
            ...p,
            responsibleName: p.responsible
                ? `${p.responsible.first_name} ${p.responsible.last_name}`
                : 'Sin asignar'
        }));
    },

    async getProjectById(projectId) {
        const { data, error } = await supabase
            .from('ciea_project')
            .select(`
                *,
                responsible:person!ciea_project_responsible_person_id_fkey (
                    person_id, first_name, last_name
                )
            `)
            .eq('ciea_project_id', projectId)
            .single();
        if (error) throw error;
        return {
            ...data,
            responsibleName: data.responsible
                ? `${data.responsible.first_name} ${data.responsible.last_name}`
                : 'Sin asignar'
        };
    },

    async createProject(projectData) {
        const { data, error } = await supabase
            .from('ciea_project')
            .insert({
                name: projectData.name,
                description: projectData.description || null,
                responsible_person_id: projectData.responsible_person_id || null,
                support_person_name: projectData.support_person_name || null,
                status: 'ACTIVO'
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateProject(projectId, updates) {
        const { data, error } = await supabase
            .from('ciea_project')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('ciea_project_id', projectId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteProject(projectId) {
        const { error } = await supabase
            .from('ciea_project')
            .delete()
            .eq('ciea_project_id', projectId);
        if (error) throw error;
    },

    // ═══ ACTIVITIES ═════════════════════════════════════════
    async getActivities(projectId) {
        const { data, error } = await supabase
            .from('ciea_activity')
            .select(`
                *,
                ciea_sub_activity (*)
            `)
            .eq('project_id', projectId)
            .order('sort_order');
        if (error) throw error;

        return (data || []).map(act => {
            const subs = (act.ciea_sub_activity || []).sort((a, b) => a.sort_order - b.sort_order);
            const totalWeight = subs.reduce((sum, s) => sum + Number(s.weight || 0), 0);
            const completedWeight = subs.filter(s => s.is_completed)
                .reduce((sum, s) => sum + Number(s.weight || 0), 0);
            const progress = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

            return {
                ...act,
                subActivities: subs,
                progress,
                totalWeight,
                completedWeight,
                totalSubs: subs.length,
                completedSubs: subs.filter(s => s.is_completed).length
            };
        });
    },

    async createActivity(projectId, activityData) {
        const { data, error } = await supabase
            .from('ciea_activity')
            .insert({
                project_id: projectId,
                name: activityData.name,
                description: activityData.description || null,
                sort_order: activityData.sort_order || 0
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateActivity(activityId, updates) {
        const { data, error } = await supabase
            .from('ciea_activity')
            .update(updates)
            .eq('ciea_activity_id', activityId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async deleteActivity(activityId) {
        const { error } = await supabase
            .from('ciea_activity')
            .delete()
            .eq('ciea_activity_id', activityId);
        if (error) throw error;
    },

    // ═══ SUB-ACTIVITIES ═════════════════════════════════════
    async createSubActivity(activityId, subData) {
        const { data, error } = await supabase
            .from('ciea_sub_activity')
            .insert({
                activity_id: activityId,
                name: subData.name,
                weight: subData.weight || 1,
                notes: subData.notes || null,
                sort_order: subData.sort_order || 0
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateSubActivity(subActivityId, updates) {
        const { data, error } = await supabase
            .from('ciea_sub_activity')
            .update(updates)
            .eq('ciea_sub_activity_id', subActivityId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async toggleSubActivity(subActivityId, isCompleted, weekStart = null) {
        const updates = {
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
            completed_week: isCompleted ? (weekStart || getMonday(new Date())) : null
        };
        return this.updateSubActivity(subActivityId, updates);
    },

    async deleteSubActivity(subActivityId) {
        const { error } = await supabase
            .from('ciea_sub_activity')
            .delete()
            .eq('ciea_sub_activity_id', subActivityId);
        if (error) throw error;
    },

    // ═══ WEEKLY ASSIGNMENTS ═════════════════════════════════
    async getAssignmentsForWeek(weekStart) {
        const { data, error } = await supabase
            .from('ciea_weekly_person_assignment')
            .select(`
                *,
                person:person!ciea_weekly_person_assignment_person_id_fkey (
                    person_id, first_name, last_name,
                    person_role (name)
                ),
                activity:ciea_activity!ciea_weekly_person_assignment_activity_id_fkey (
                    ciea_activity_id, name, project_id,
                    ciea_project:ciea_project!ciea_activity_project_id_fkey (name)
                )
            `)
            .eq('week_start', weekStart);
        if (error) throw error;
        return (data || []).map(a => ({
            ...a,
            personName: a.person ? `${a.person.first_name} ${a.person.last_name}` : '?',
            personRole: a.person?.person_role?.name || 'Sin rol',
            activityName: a.activity?.name || '?',
            projectName: a.activity?.ciea_project?.name || '?'
        }));
    },

    async assignPersonToActivity(activityId, personId, weekStart, roleInActivity = null, notes = null) {
        const { data, error } = await supabase
            .from('ciea_weekly_person_assignment')
            .insert({
                activity_id: activityId,
                person_id: personId,
                week_start: weekStart,
                role_in_activity: roleInActivity,
                notes
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') {
                throw new Error('Esta persona ya tiene una actividad asignada en esta semana.');
            }
            throw error;
        }
        return data;
    },

    async removeAssignment(assignmentId) {
        const { error } = await supabase
            .from('ciea_weekly_person_assignment')
            .delete()
            .eq('assignment_id', assignmentId);
        if (error) throw error;
    },

    // ═══ OCCUPATION CONTROL ═════════════════════════════════
    /**
     * Get all operative staff (not community members) with their assignment for a given week
     */
    async getPersonOccupationForWeek(weekStart) {
        // 1. Get all operative staff
        const staff = await this.getOperativeStaff();

        // 2. Get all assignments for this week
        const assignments = await this.getAssignmentsForWeek(weekStart);
        const assignmentMap = {};
        assignments.forEach(a => {
            assignmentMap[a.person_id] = a;
        });

        // 3. Merge
        return staff.map(person => ({
            ...person,
            assignment: assignmentMap[person.person_id] || null,
            isAssigned: !!assignmentMap[person.person_id],
            assignedActivity: assignmentMap[person.person_id]?.activityName || null
        }));
    },

    /**
     * Get unassigned operative staff for a week
     */
    async getUnassignedOperatives(weekStart) {
        const occupation = await this.getPersonOccupationForWeek(weekStart);
        return occupation.filter(p => !p.isAssigned);
    },

    // ═══ STAFF QUERIES ══════════════════════════════════════
    /**
     * Get all active operative staff (excludes community members)
     */
    async getOperativeStaff() {
        const { data, error } = await supabase
            .from('person')
            .select(`
                person_id, first_name, last_name, document_id, active,
                person_role (role_id, name)
            `)
            .eq('active', true)
            .order('first_name');
        if (error) throw error;

        // Filter out community members in JS (safeguard)
        return (data || []).filter(p => {
            const role = p.person_role?.name;
            return role && role !== 'Miembro de Comunidad' && role !== 'Comunidad';
        }).map(p => ({
            ...p,
            fullName: `${p.first_name} ${p.last_name}`,
            roleName: p.person_role?.name || 'Sin rol'
        }));
    },

    /**
     * Get people with Ingeniero Lider role (for project responsible dropdown)
     */
    async getLeadEngineers() {
        const { data, error } = await supabase
            .from('person')
            .select(`
                person_id, first_name, last_name,
                person_role (name)
            `)
            .eq('active', true)
            .order('first_name');
        if (error) throw error;

        return (data || []).filter(p => {
            const role = p.person_role?.name;
            return role === 'Ingeniero Lider' || role === 'Supervisor' || role === 'Administrador';
        }).map(p => ({
            person_id: p.person_id,
            fullName: `${p.first_name} ${p.last_name}`,
            roleName: p.person_role?.name
        }));
    },

    // ═══ REPORTS ═════════════════════════════════════════════
    /**
     * Generate weekly report data
     */
    async getWeeklyReport(projectId, weekStart) {
        const activities = await this.getActivities(projectId);
        const assignments = await this.getAssignmentsForWeek(weekStart);

        const activityAssignments = {};
        assignments.forEach(a => {
            const actId = a.activity_id;
            if (!activityAssignments[actId]) activityAssignments[actId] = [];
            activityAssignments[actId].push(a);
        });

        return activities.map(act => ({
            activityName: act.name,
            status: act.status,
            progress: act.progress,
            totalSubs: act.totalSubs,
            completedSubs: act.completedSubs,
            personnel: (activityAssignments[act.ciea_activity_id] || []).map(a => ({
                name: a.personName,
                role: a.personRole,
                roleInActivity: a.role_in_activity
            }))
        }));
    },

    /**
     * Generate total project report
     */
    async getTotalReport(projectId) {
        const project = await this.getProjectById(projectId);
        const activities = await this.getActivities(projectId);

        // Get all assignments for all activities in the project
        const activityIds = activities.map(a => a.ciea_activity_id);
        let allAssignments = [];
        if (activityIds.length > 0) {
            const { data, error } = await supabase
                .from('ciea_weekly_person_assignment')
                .select(`
                    *,
                    person:person!ciea_weekly_person_assignment_person_id_fkey (
                        person_id, first_name, last_name,
                        person_role (name)
                    )
                `)
                .in('activity_id', activityIds)
                .order('week_start');
            if (error) throw error;
            allAssignments = data || [];
        }

        // Group assignments by activity then by week
        const assignmentsByActivity = {};
        const allWeeks = new Set();
        allAssignments.forEach(a => {
            if (!assignmentsByActivity[a.activity_id]) assignmentsByActivity[a.activity_id] = {};
            if (!assignmentsByActivity[a.activity_id][a.week_start]) assignmentsByActivity[a.activity_id][a.week_start] = [];
            assignmentsByActivity[a.activity_id][a.week_start].push({
                name: a.person ? `${a.person.first_name} ${a.person.last_name}` : '?',
                role: a.person?.person_role?.name || 'Sin rol'
            });
            allWeeks.add(a.week_start);
        });

        const totalWeight = activities.reduce((s, a) => s + (a.totalSubs > 0 ? 1 : 0), 0);
        const totalProgress = totalWeight > 0
            ? Math.round(activities.reduce((s, a) => s + a.progress, 0) / totalWeight)
            : 0;

        return {
            project,
            activities: activities.map(act => ({
                ...act,
                weeklyAssignments: assignmentsByActivity[act.ciea_activity_id] || {}
            })),
            totalProgress,
            totalActivities: activities.length,
            completedActivities: activities.filter(a => a.progress === 100).length,
            totalWeeks: allWeeks.size,
            weeks: [...allWeeks].sort()
        };
    }
};
