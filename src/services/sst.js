import { supabase } from './supabase';

export const SSTService = {

    // ═══════════════════════════════════════════════════════
    // PERSONNEL WITH EPP STATUS
    // ═══════════════════════════════════════════════════════

    /**
     * Get all operational staff with their EPP compliance status
     * (excludes community members)
     */
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

        // 2. Get role requirements (what EPP each role needs)
        const { data: requirements } = await supabase
            .from('epp_role_requirement')
            .select('*, safety_equipment(name, code)');

        const reqByRole = {};
        (requirements || []).forEach(r => {
            if (!reqByRole[r.role_id]) reqByRole[r.role_id] = [];
            reqByRole[r.role_id].push(r);
        });

        // 3. Get latest delivery items per person
        const { data: deliveryItems } = await supabase
            .from('epp_delivery_item')
            .select('*, safety_equipment(name, code)')
            .order('created_at', { ascending: false });

        // Build a map of latest delivery per person+safety_id
        const latestDelivery = {};
        (deliveryItems || []).forEach(di => {
            const key = `${di.person_id}-${di.safety_id}`;
            if (!latestDelivery[key]) latestDelivery[key] = di;
        });

        // 4. Get certifications
        const { data: certs } = await supabase
            .from('person_certification')
            .select('*');

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

            // Compute EPP zone statuses
            const zones = {};
            roleReqs.forEach(req => {
                const key = `${p.person_id}-${req.safety_id}`;
                const delivery = latestDelivery[key];

                let zoneStatus = 'MISSING'; // red
                if (delivery) {
                    if (delivery.expires_at) {
                        const expDate = new Date(delivery.expires_at);
                        if (expDate < now) {
                            zoneStatus = 'EXPIRED'; // red
                        } else if (expDate < thirtyDaysFromNow) {
                            zoneStatus = 'EXPIRING'; // yellow
                            eppExpiring++;
                            eppOk++;
                        } else {
                            zoneStatus = 'OK'; // green
                            eppOk++;
                        }
                    } else {
                        // No expiration set — check by renewal_months
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

            // Overall status
            let eppStatus = 'OK';
            if (eppMissing > 0 || (roleReqs.length > 0 && eppOk === 0 && roleReqs.some(r => {
                const key = `${p.person_id}-${r.safety_id}`;
                const del = latestDelivery[key];
                return del && new Date(del.expires_at || del.created_at) < now;
            }))) {
                eppStatus = 'INCOMPLETE';
            }
            if (eppExpiring > 0 && eppMissing === 0) eppStatus = 'EXPIRING';
            if (eppTotal === 0) eppStatus = 'NO_REQUIREMENTS';
            if (eppOk === eppTotal && eppTotal > 0) eppStatus = 'OK';
            if (eppMissing > 0) eppStatus = 'INCOMPLETE';

            // Cert status
            let certStatus = 'OK';
            const expiringCerts = personCerts.filter(c => {
                if (!c.expires_at) return false;
                const exp = new Date(c.expires_at);
                return exp < thirtyDaysFromNow;
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
        // Get person
        const { data: person, error: pErr } = await supabase
            .from('person')
            .select('*, person_role(role_id, name)')
            .eq('person_id', personId)
            .single();

        if (pErr) throw pErr;

        const roleId = person.person_role?.role_id;

        // Get role requirements
        const { data: requirements } = await supabase
            .from('epp_role_requirement')
            .select('*, safety_equipment(name, code)')
            .eq('role_id', roleId);

        // Get ALL delivery items for this person
        const { data: deliveries } = await supabase
            .from('epp_delivery_item')
            .select('*, safety_equipment(name, code), epp_delivery(delivery_date, notes)')
            .eq('person_id', personId)
            .order('created_at', { ascending: false });

        // Get certifications
        const { data: certs } = await supabase
            .from('person_certification')
            .select('*')
            .eq('person_id', personId)
            .order('expires_at', { ascending: true });

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
        const { data, error } = await supabase
            .from('epp_role_requirement')
            .select('*, safety_equipment(name, code)')
            .eq('role_id', roleId);

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

    /**
     * Create a bulk delivery to multiple people
     * @param {object} deliveryData - { delivery_date, notes, items: [{ person_id, safety_id, quantity, condition, size, expires_at }] }
     */
    async createDelivery(deliveryData) {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Create delivery header
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

        // 2. Create delivery items
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

    /**
     * Quick deliver a single EPP to a person (from silhouette click)
     */
    async quickDeliverEPP(personId, safetyId, renewalMonths = 6) {
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
                expires_at: expiresAt.toISOString().split('T')[0],
            }],
        });
    },

    async getDeliveryHistory(filters = {}) {
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

        const { data, error } = await query.limit(100);
        if (error) throw error;
        return data || [];
    },

    // ═══════════════════════════════════════════════════════
    // CERTIFICATIONS
    // ═══════════════════════════════════════════════════════

    async getPersonCertifications(personId) {
        const { data, error } = await supabase
            .from('person_certification')
            .select('*')
            .eq('person_id', personId)
            .order('expires_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    async upsertCertification(certData) {
        if (certData.cert_id) {
            // Update
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
            // Create
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

        // Expiring EPP deliveries
        const { data: eppAlerts } = await supabase
            .from('epp_delivery_item')
            .select('*, person:person_id(first_name, last_name), safety_equipment:safety_id(name)')
            .lte('expires_at', isoDate)
            .order('expires_at', { ascending: true })
            .limit(50);

        // Expiring certifications
        const { data: certAlerts } = await supabase
            .from('person_certification')
            .select('*, person:person_id(first_name, last_name)')
            .lte('expires_at', isoDate)
            .order('expires_at', { ascending: true })
            .limit(50);

        return {
            eppAlerts: eppAlerts || [],
            certAlerts: certAlerts || [],
        };
    },

    async getEPPAnalytics() {
        // Get all delivery items
        const { data: items } = await supabase
            .from('epp_delivery_item')
            .select('*, safety_equipment:safety_id(name, code)');

        // Analytics: consumption by EPP
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

        // Monthly trend
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
            .select('role_id, name')
            .neq('name', 'Miembro de Comunidad')
            .neq('name', 'Comunidad')
            .order('name');

        if (error) throw error;
        return data || [];
    },
};
