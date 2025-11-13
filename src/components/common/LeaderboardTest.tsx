import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LeaderboardTest = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult("🔍 Starting comprehensive leaderboard tests...");
      
      // Test 1: Check if RPC function exists and works
      addResult("📊 Testing RPC function existence...");
      const { data: rpcData, error: rpcError } = await (supabase as any)
        .rpc('get_leaderboard_data');
      
      if (rpcError) {
        addResult(`❌ RPC function failed: ${rpcError.message}`);
        addResult(`   Error code: ${rpcError.code}`);
        addResult(`   Error details: ${JSON.stringify(rpcError.details)}`);
      } else {
        addResult(`✅ RPC function works! Found ${rpcData?.length || 0} entries`);
        if (rpcData && rpcData.length > 0) {
          addResult(`   Top user: ${rpcData[0].user_name} with ${rpcData[0].total_points} points`);
          addResult(`   Sample data: ${JSON.stringify(rpcData.slice(0, 2))}`);
        }
      }
      
      // Test 2: Check user_quiz_attempts access and data
      addResult("📝 Testing user_quiz_attempts access...");
      const { data: attemptsData, error: attemptsError } = await supabase
        .from("user_quiz_attempts")
        .select("count", { count: "exact", head: true });
      
      if (attemptsError) {
        addResult(`❌ Attempts access failed: ${attemptsError.message}`);
      } else {
        addResult(`✅ Attempts access works! Found ${attemptsData || 0} attempts`);
        
        // Get sample attempts
        const { data: sampleAttempts, error: sampleError } = await supabase
          .from("user_quiz_attempts")
          .select("user_id, score, quiz_id, completed_at")
          .limit(3);
        
        if (!sampleError && sampleAttempts) {
          addResult(`   Sample attempts: ${JSON.stringify(sampleAttempts)}`);
        }
      }
      
      // Test 3: Check user_points table
      addResult("🏆 Testing user_points access...");
      const { data: pointsData, error: pointsError } = await (supabase as any)
        .from("user_points")
        .select("count", { count: "exact", head: true });
      
      if (pointsError) {
        addResult(`❌ User points access failed: ${pointsError.message}`);
      } else {
        addResult(`✅ User points access works! Found ${pointsData || 0} entries`);
        
        // Get sample user_points
        const { data: samplePoints, error: samplePointsError } = await (supabase as any)
          .from("user_points")
          .select("user_id, total_points, quiz_points, quizzes_completed")
          .limit(3);
        
        if (!samplePointsError && samplePoints) {
          addResult(`   Sample user points: ${JSON.stringify(samplePoints)}`);
        }
      }
      
      // Test 4: Check profiles table
      addResult("👤 Testing profiles access...");
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("count", { count: "exact", head: true });
      
      if (profilesError) {
        addResult(`❌ Profiles access failed: ${profilesError.message}`);
      } else {
        addResult(`✅ Profiles access works! Found ${profilesData || 0} profiles`);
      }
      
      // Test 5: Manual leaderboard query
      addResult("🔧 Testing manual leaderboard query...");
      try {
        // First get user_points data
        const { data: pointsData, error: pointsError } = await (supabase as any)
          .from("user_points")
          .select("user_id, total_points, quiz_points, achievement_points, quizzes_completed")
          .gt("quizzes_completed", 0)
          .order("total_points", { ascending: false })
          .limit(5);
        
        if (pointsError) {
          addResult(`❌ Points query failed: ${pointsError.message}`);
        } else {
          addResult(`✅ Points query works! Found ${pointsData?.length || 0} entries`);
          
          if (pointsData && pointsData.length > 0) {
            // Get profile names for these users
            const userIds = pointsData.map(p => p.user_id);
            const { data: profilesData, error: profilesError } = await supabase
              .from("profiles")
              .select("id, name, profile_pic")
              .in("id", userIds);
            
            if (!profilesError && profilesData) {
              const combinedData = pointsData.map(point => ({
                ...point,
                profile: profilesData.find(p => p.id === point.user_id)
              }));
              addResult(`   Top entry: ${JSON.stringify(combinedData[0])}`);
            }
          }
        }
      } catch (err: any) {
        addResult(`❌ Manual query error: ${err.message}`);
      }
      
      // Test 6: Check for users with attempts but no points
      addResult("🔍 Checking for users with attempts but no points...");
      try {
        const { data: orphanedUsers, error: orphanedError } = await supabase
          .from("user_quiz_attempts")
          .select("user_id")
          .limit(5);
        
        if (!orphanedError && orphanedUsers) {
          const userIds = [...new Set(orphanedUsers.map(u => u.user_id))];
          
          // Get profiles for these users
          const { data: userProfiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, name")
            .in("id", userIds);
          
          if (!profileError && userProfiles) {
            addResult(`   Found users with attempts: ${userProfiles.map(u => u.name).join(", ")}`);
          }
        }
      } catch (err: any) {
        addResult(`❌ Orphaned users check failed: ${err.message}`);
      }
      
      addResult("🎯 Tests completed! Check the results above.");
      
    } catch (error: any) {
      addResult(`❌ Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 Leaderboard Diagnostic Tool</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={runTests} disabled={loading}>
            {loading ? "🔄 Running Tests..." : "🚀 Run Comprehensive Tests"}
          </Button>
          
          {testResults.length > 0 && (
            <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
              <h4 className="font-semibold mb-2">📋 Test Results:</h4>
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {testResults.join('\n')}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaderboardTest;
