import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const {
      workspace_id,
      full_name,
      first_name,
      last_name,
      email,
      phone,
      hire_date,
      start_date,
      employment_type,
      contract_type,
      position_id,
      department_id,
      department,
      job_title,
      manager_id,
      date_of_birth,
      work_location,
      remote_status,
      weekly_hours,
    } = body;

    if (!workspace_id) throw new Error("workspace_id is required");

    // Verify user has access to this workspace
    const { data: membership, error: memError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace_id)
      .eq("user_id", user.id)
      .single();

    if (memError || !membership) throw new Error("Access denied");
    if (!["admin", "owner"].includes(membership.role)) {
      throw new Error("Only admins can create employees");
    }

    // Generate employee number
    const { data: lastEmployee } = await supabase
      .from("hr_employees")
      .select("employee_number")
      .eq("workspace_id", workspace_id)
      .not("employee_number", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (lastEmployee?.employee_number) {
      const match = lastEmployee.employee_number.match(/(\d+)$/);
      if (match) nextNumber = parseInt(match[1]) + 1;
    }
    const employee_number = `EMP-${String(nextNumber).padStart(3, "0")}`;

    // Resolve names
    const resolvedFirstName = first_name || (full_name ? full_name.split(" ")[0] : "");
    const resolvedLastName = last_name || (full_name ? full_name.split(" ").slice(1).join(" ") : "");
    const resolvedFullName = full_name || `${resolvedFirstName} ${resolvedLastName}`.trim();

    const { data: employee, error } = await supabase
      .from("hr_employees")
      .insert({
        workspace_id,
        employee_number,
        full_name: resolvedFullName,
        first_name: resolvedFirstName,
        last_name: resolvedLastName,
        email: email || null,
        phone: phone || null,
        hire_date: hire_date || start_date || null,
        start_date: start_date || hire_date || null,
        employment_type: employment_type || contract_type || "full_time",
        contract_type: contract_type || employment_type || "full_time",
        employment_status: "active",
        status: "active",
        position_id: position_id || null,
        department_id: department_id || null,
        department: department || null,
        job_title: job_title || null,
        manager_id: manager_id || null,
        date_of_birth: date_of_birth || null,
        work_location: work_location || null,
        remote_status: remote_status || null,
        weekly_hours: weekly_hours || 40,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ employee }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
