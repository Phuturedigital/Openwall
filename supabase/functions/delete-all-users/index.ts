import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DeleteResponse {
  success: boolean;
  message: string;
  stats?: {
    usersDeleted: number;
    profilesDeleted: number;
    notesDeleted: number;
    requestsDeleted: number;
    notificationsDeleted: number;
    activityLogsDeleted: number;
  };
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const userIds = users.users.map((u) => u.id);
    let stats = {
      usersDeleted: 0,
      profilesDeleted: 0,
      notesDeleted: 0,
      requestsDeleted: 0,
      notificationsDeleted: 0,
      activityLogsDeleted: 0,
    };

    const { count: profileCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });
    stats.profilesDeleted = profileCount || 0;

    const { count: noteCount } = await supabase
      .from("notes")
      .select("*", { count: "exact", head: true });
    stats.notesDeleted = noteCount || 0;

    const { count: requestCount } = await supabase
      .from("connection_requests")
      .select("*", { count: "exact", head: true });
    stats.requestsDeleted = requestCount || 0;

    const { count: notificationCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true });
    stats.notificationsDeleted = notificationCount || 0;

    const { count: activityCount } = await supabase
      .from("user_activity_logs")
      .select("*", { count: "exact", head: true });
    stats.activityLogsDeleted = activityCount || 0;

    await supabase.from("user_activity_logs").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("notifications").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("connection_requests").delete().neq("requester_id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("notes").delete().neq("user_id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    for (const userId of userIds) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error(`Failed to delete user ${userId}:`, deleteError);
      } else {
        stats.usersDeleted++;
      }
    }

    const response: DeleteResponse = {
      success: true,
      message: `Successfully deleted all users and data`,
      stats,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in delete-all-users function:", error);

    const errorResponse: DeleteResponse = {
      success: false,
      message: "Failed to delete users",
      error: error instanceof Error ? error.message : "Unknown error",
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
