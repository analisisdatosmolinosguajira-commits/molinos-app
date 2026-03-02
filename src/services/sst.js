import { supabase } from './supabase';

/**
 * Safe query helper — returns empty array/null if table doesn't exist (404).
 * This allows the SST module to work gracefully before DB migration is run.
 */
async function safeQuery(queryFn) {
    try {
        const result = await queryFn();
        if (result.error) {
            const code = result.error.code;
            const msg = result.error.message || '';
            // Silently handle missing tables (404) and RLS/permission errors (403)
            if (code === 'PGRST205' || code === '42501' || code === 'PGRST301' ||
                msg.includes('Not Found') || msg.includes('permission denied') ||
                msg.includes('row-level security')) {
                return { data: null, error: null };
            }
        }
        return result;
    } catch (err) {
        return { data: null, error: null };
    }
}

export const SSTService = {

    // ═══════════════════════════════════════════════════════
    // PERSONNEL WITH EPP STATUS
    // ═══════════════════════════════════════════════════════

    async getStaffWithEPPStatus() {
        // 1. Get all operational staff
        const { data: people, error: pErr } = await supabase
            .from('person')
            .select(`
                person_id, first_name, last_name, document_id, phone, email, active,
                person_role (role_id, name)
            `)
            .order('first_name');

        if (pErr) throw pErr;

        const staff = (people || []).filter(p => {
            const role = p.person_role?.name;
            return role && role !== 'Miembro de Comunidad' && role !== 'Comunidad';
        });

        // 2. Get role requirements (safe — may not exist yet)
        const { data: requirements } = await safeQuery(() =>
            supabase.from('epp_role_requirement').select('*, safety_equipment(name, code)')
        );

        const reqByRole = {};
        (requirements || []).forEach(r => {
            if (!reqByRole[r.role_id]) reqByRole[r.role_id] = [];
            reqByRole[r.role_id].push(r);
        });

        // 3. Get latest delivery items per person (safe)
        const { data: deliveryItems } = await safeQuery(() =>
            supabase.from('epp_delivery_item')
                .select('*, safety_equipment(name, code)')
                .order('created_at', { ascending: false })
        );

        const latestDelivery = {};
        (deliveryItems || []).forEach(di => {
            const key = `${di.person_id}-${di.safety_id}`;
            if (!latestDelivery[key]) latestDelivery[key] = di;
        });

        // 4. Get certifications (safe)
        const { data: certs } = await safeQuery(() =>
            supabase.from('person_certification').select('*')
        );

        const certsByPerson = {};
        (certs || []).forEach(c => {
            if (!certsByPerson[c.person_id]) certsByPerson[c.person_id] = [];
            certsByPerson[c.person_id].push(c);
        });

        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        // 5. Compute status for each staff member
        return staff.map(p => {
            const roleId = p.person_role?.role_id;
            const roleReqs = reqByRole[roleId] || [];
            const personCerts = certsByPerson[p.person_id] || [];

            let eppTotal = roleReqs.length;
            let eppOk = 0;
            let eppExpiring = 0;
            let eppMissing = 0;

            const zones = {};
            roleReqs.forEach(req => {
                const key = `${p.person_id}-${req.safety_id}`;
                const delivery = latestDelivery[key];

                let zoneStatus = 'MISSING';
                if (delivery) {
                    if (delivery.expires_at) {
                        const expDate = new Date(delivery.expires_at);
                        if (expDate < now) {
                            zoneStatus = 'EXPIRED';
                        } else if (expDate < thirtyDaysFromNow) {
                            zoneStatus = 'EXPIRING';
                            eppExpiring++;
                            eppOk++;
                        } else {
                            zoneStatus = 'OK';
                            eppOk++;
                        }
                    } else {
                        const deliveryDate = new Date(delivery.created_at);
                        const expDate = new Date(deliveryDate);
                        expDate.setMonth(expDate.getMonth() + (req.renewal_months || 6));

                        if (expDate < now) {
                            zoneStatus = 'EXPIRED';
                        } else if (expDate < thirtyDaysFromNow) {
                            zoneStatus = 'EXPIRING';
                            eppExpiring++;
                            eppOk++;
                        } else {
                            zoneStatus = 'OK';
                            eppOk++;
                        }
                    }
                } else {
                    eppMissing++;
                }

                zones[req.body_zone] = {
                    status: zoneStatus,
                    requirement: req,
                    lastDelivery: delivery || null,
                    eppName: req.safety_equipment?.name || 'EPP',
                };
            });

            let eppStatus = 'OK';
            if (eppMissing > 0) eppStatus = 'INCOMPLETE';
            else if (eppExpiring > 0) eppStatus = 'EXPIRING';
            else if (eppTotal === 0) eppStatus = 'NO_REQUIREMENTS';
            else if (eppOk === eppTotal && eppTotal > 0) eppStatus = 'OK';

            let certStatus = 'OK';
            const expiringCerts = personCerts.filter(c => {
                if (!c.expires_at) return false;
                return new Date(c.expires_at) < thirtyDaysFromNow;
            });
            if (expiringCerts.length > 0) certStatus = 'EXPIRING';
            const expiredCerts = personCerts.filter(c => {
                if (!c.expires_at) return false;
                return new Date(c.expires_at) < now;
            });
            if (expiredCerts.length > 0) certStatus = 'EXPIRED';

            return {
                ...p,
                role: p.person_role?.name || 'Sin Rol',
                roleId,
                eppStatus,
                eppTotal,
                eppOk,
                eppExpiring,
                eppMissing,
                zones,
                certifications: personCerts,
                certStatus,
                expiringCertsCount: expiringCerts.length,
            };
        });
    },

    // ═══════════════════════════════════════════════════════
    // PERSON EPP DETAIL
    // ═══════════════════════════════════════════════════════

    async getPersonEPPDetail(personId) {
        const { data: person, error: pErr } = await supabase
            .from('person')
            .select('*, person_role(role_id, name)')
            .eq('person_id', personId)
            .single();

        if (pErr) throw pErr;

        const roleId = person.person_role?.role_id;

        // Safe queries
        const { data: requirements } = await safeQuery(() =>
            supabase.from('epp_role_requirement')
                .select('*, safety_equipment(name, code)')
                .eq('role_id', roleId)
        );

        const { data: deliveries } = await safeQuery(() =>
            supabase.from('epp_delivery_item')
                .select('*, safety_equipment(name, code), epp_delivery(delivery_date, notes)')
                .eq('person_id', personId)
                .order('created_at', { ascending: false })
        );

        const { data: certs } = await safeQuery(() =>
            supabase.from('person_certification')
                .select('*')
                .eq('person_id', personId)
                .order('expires_at', { ascending: true })
        );

        return {
            person: {
                ...person,
                role: person.person_role?.name || 'Sin Rol',
                roleId,
            },
            requirements: requirements || [],
            deliveryHistory: deliveries || [],
            certifications: certs || [],
        };
    },

    // ═══════════════════════════════════════════════════════
    // ROLE REQUIREMENTS MANAGEMENT
    // ═══════════════════════════════════════════════════════

    async getRoleRequirements(roleId) {
        const { data, error } = await safeQuery(() =>
            supabase.from('epp_role_requirement')
                .select('*, safety_equipment(name, code)')
                .eq('role_id', roleId)
        );
        if (error) throw error;
        return data || [];
    },

    async addRoleRequirement(roleId, safetyId, bodyZone, renewalMonths = 6) {
        const { data, error } = await supabase
            .from('epp_role_requirement')
            .insert([{ role_id: roleId, safety_id: safetyId, body_zone: bodyZone, renewal_months: renewalMonths }])
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async deleteRoleRequirement(id) {
        const { error } = await supabase
            .from('epp_role_requirement')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // ═══════════════════════════════════════════════════════
    // EPP DELIVERIES
    // ═══════════════════════════════════════════════════════

    async createDelivery(deliveryData) {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: delivery, error: dErr } = await supabase
            .from('epp_delivery')
            .insert([{
                delivery_date: deliveryData.delivery_date || new Date().toISOString().split('T')[0],
                delivered_by: user?.id || null,
                notes: deliveryData.notes || '',
            }])
            .select()
            .single();

        if (dErr) throw dErr;

        const items = deliveryData.items.map(item => ({
            delivery_id: delivery.delivery_id,
            person_id: item.person_id,
            safety_id: item.safety_id,
            quantity: item.quantity || 1,
            condition: item.condition || 'NUEVO',
            size: item.size || null,
            expires_at: item.expires_at || null,
        }));

        const { error: iErr } = await supabase
            .from('epp_delivery_item')
            .insert(items);

        if (iErr) throw iErr;

        return delivery;
    },

    async quickDeliverEPP(personId, safetyId, renewalMonths = 6, size = '') {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + renewalMonths);

        return this.createDelivery({
            delivery_date: new Date().toISOString().split('T')[0],
            notes: 'Entrega rápida desde detalle SST',
            items: [{
                person_id: personId,
                safety_id: safetyId,
                quantity: 1,
                condition: 'NUEVO',
                size: size || null,
                expires_at: expiresAt.toISOString().split('T')[0],
            }],
        });
    },

    // Get full planning data: all staff with their requirements, last deliveries, and sizes
    async getRequisitionPlanData() {
        // 1. Get all operational staff with roles
        const { data: people } = await safeQuery(() =>
            supabase.from('person')
                .select('person_id, first_name, last_name, document_id, role_id, person_role(role_id, name)')
                .eq('active', true)
                .not('role_id', 'is', null)
                .order('first_name')
        );

        if (!people || people.length === 0) return { people: [], plan: [] };

        // Filter out community members
        const staff = people.filter(p => {
            const rn = p.person_role?.name?.toLowerCase() || '';
            return !rn.includes('comunidad');
        });

        // 2. Get all role requirements
        const roleIds = [...new Set(staff.map(p => p.role_id).filter(Boolean))];
        const { data: allReqs } = await safeQuery(() =>
            supabase.from('epp_role_requirement')
                .select('*, safety_equipment(safety_id, name, code)')
                .in('role_id', roleIds)
        );

        // 3. Get all latest delivery items for these people
        const personIds = staff.map(p => p.person_id);
        const { data: allDeliveries } = await safeQuery(() =>
            supabase.from('epp_delivery_item')
                .select('*, epp_delivery(delivery_date), safety_equipment:safety_id(name, code)')
                .in('person_id', personIds)
                .order('created_at', { ascending: false })
        );

        // Build per-person plan
        const now = new Date();
        const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const planItems = [];

        for (const person of staff) {
            const roleReqs = (allReqs || []).filter(r => r.role_id === person.role_id);
            const personDeliveries = (allDeliveries || []).filter(d => d.person_id === person.person_id);

            for (const req of roleReqs) {
                // Find latest delivery for this EPP
                const lastDelivery = personDeliveries.find(d => d.safety_id === req.safety_id);

                let status = 'MISSING';
                let expiresAt = null;
                if (lastDelivery) {
                    if (lastDelivery.expires_at) {
                        expiresAt = new Date(lastDelivery.expires_at);
                    } else {
                        expiresAt = new Date(lastDelivery.created_at);
                        expiresAt.setMonth(expiresAt.getMonth() + (req.renewal_months || 6));
                    }

                    if (expiresAt < now) status = 'EXPIRED';
                    else if (expiresAt < thirtyDays) status = 'EXPIRING';
                    else status = 'OK';
                }

                // Only include items that need action (not OK)
                const needsAction = status !== 'OK';

                planItems.push({
                    person_id: person.person_id,
                    first_name: person.first_name,
                    last_name: person.last_name,
                    role: person.person_role?.name || 'Sin Rol',
                    safety_id: req.safety_id,
                    epp_name: req.safety_equipment?.name || 'EPP',
                    epp_code: req.safety_equipment?.code || '',
                    body_zone: req.body_zone,
                    renewal_months: req.renewal_months || 6,
                    status,
                    expires_at: expiresAt?.toISOString().split('T')[0] || null,
                    last_size: lastDelivery?.size || '',
                    last_delivery_date: lastDelivery?.created_at ? new Date(lastDelivery.created_at).toISOString().split('T')[0] : null,
                    needs_action: needsAction,
                    include_in_plan: needsAction, // default checked if needs action
                    quantity: 1,
                });
            }
        }

        return { people: staff, plan: planItems };
    },

    async getDeliveryHistory(filters = {}) {
        const { data, error } = await safeQuery(() => {
            let query = supabase
                .from('epp_delivery')
                .select(`
                    *,
                    epp_delivery_item (
                        *,
                        person:person_id (person_id, first_name, last_name),
                        safety_equipment:safety_id (name, code)
                    )
                `)
                .order('delivery_date', { ascending: false });

            if (filters.startDate) query = query.gte('delivery_date', filters.startDate);
            if (filters.endDate) query = query.lte('delivery_date', filters.endDate);

            return query.limit(100);
        });

        if (error) throw error;
        return data || [];
    },

    async updateDelivery(deliveryId, { delivery_date, notes }) {
        const { data, error } = await safeQuery(() =>
            supabase.from('epp_delivery')
                .update({ delivery_date, notes })
                .eq('delivery_id', deliveryId)
                .select()
                .single()
        );
        if (error) throw error;
        return data;
    },

    async deleteDelivery(deliveryId) {
        // Delete items first (cascade)
        const { error: itemErr } = await safeQuery(() =>
            supabase.from('epp_delivery_item')
                .delete()
                .eq('delivery_id', deliveryId)
        );
        if (itemErr) throw itemErr;

        const { error } = await safeQuery(() =>
            supabase.from('epp_delivery')
                .delete()
                .eq('delivery_id', deliveryId)
        );
        if (error) throw error;
    },

    // ═══════════════════════════════════════════════════════
    // CERTIFICATIONS
    // ═══════════════════════════════════════════════════════

    async getPersonCertifications(personId) {
        const { data, error } = await safeQuery(() =>
            supabase.from('person_certification')
                .select('*')
                .eq('person_id', personId)
                .order('expires_at', { ascending: true })
        );
        if (error) throw error;
        return data || [];
    },

    async upsertCertification(certData) {
        if (certData.cert_id) {
            const { data, error } = await supabase
                .from('person_certification')
                .update({
                    cert_name: certData.cert_name,
                    cert_type: certData.cert_type,
                    issued_date: certData.issued_date,
                    expires_at: certData.expires_at,
                    institution: certData.institution,
                    certificate_url: certData.certificate_url,
                    status: certData.status || 'VIGENTE',
                })
                .eq('cert_id', certData.cert_id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } else {
            const { data, error } = await supabase
                .from('person_certification')
                .insert([certData])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
    },

    async deleteCertification(certId) {
        const { error } = await supabase
            .from('person_certification')
            .delete()
            .eq('cert_id', certId);

        if (error) throw error;
    },

    // ═══════════════════════════════════════════════════════
    // ALERTS & ANALYTICS
    // ═══════════════════════════════════════════════════════

    async getExpiringAlerts() {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const isoDate = thirtyDaysFromNow.toISOString().split('T')[0];

        const { data: eppAlerts } = await safeQuery(() =>
            supabase.from('epp_delivery_item')
                .select('*, person:person_id(first_name, last_name), safety_equipment:safety_id(name)')
                .lte('expires_at', isoDate)
                .order('expires_at', { ascending: true })
                .limit(50)
        );

        const { data: certAlerts } = await safeQuery(() =>
            supabase.from('person_certification')
                .select('*, person:person_id(first_name, last_name)')
                .lte('expires_at', isoDate)
                .order('expires_at', { ascending: true })
                .limit(50)
        );

        return {
            eppAlerts: eppAlerts || [],
            certAlerts: certAlerts || [],
        };
    },

    async getEPPAnalytics() {
        const { data: items } = await safeQuery(() =>
            supabase.from('epp_delivery_item')
                .select('*, safety_equipment:safety_id(name, code)')
        );

        const byEPP = {};
        (items || []).forEach(item => {
            const name = item.safety_equipment?.name || 'Desconocido';
            if (!byEPP[name]) byEPP[name] = { name, total: 0, lastMonth: 0 };
            byEPP[name].total += item.quantity;

            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            if (new Date(item.created_at) > oneMonthAgo) {
                byEPP[name].lastMonth += item.quantity;
            }
        });

        const monthlyMap = {};
        (items || []).forEach(item => {
            const month = new Date(item.created_at).toISOString().slice(0, 7);
            if (!monthlyMap[month]) monthlyMap[month] = 0;
            monthlyMap[month] += item.quantity;
        });

        const monthly = Object.entries(monthlyMap)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month))
            .slice(-12);

        return {
            byEPP: Object.values(byEPP).sort((a, b) => b.total - a.total),
            monthly,
            totalDeliveries: (items || []).length,
            totalItems: (items || []).reduce((sum, i) => sum + i.quantity, 0),
        };
    },

    // ═══════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════

    async getSafetyEquipmentList() {
        const { data, error } = await supabase
            .from('safety_equipment')
            .select('safety_id, name, code')
            .order('name');

        if (error) throw error;
        return data || [];
    },

    async getOperationalRoles() {
        const { data, error } = await supabase
            .from('person_role')
            .select('role_id, name, description')
            .neq('name', 'Miembro de Comunidad')
            .neq('name', 'Comunidad')
            .order('name');

        if (error) throw error;
        return data || [];
    },
};
