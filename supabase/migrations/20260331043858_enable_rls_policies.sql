-- Enable RLS if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe - won't error)
DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
DROP POLICY IF EXISTS "Users can view their own posts" ON posts;

-- Create fresh policies for edit and delete
CREATE POLICY "Users can update their own posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Optional: View policy (you can remove this line later if your feed needs to show all public posts)
CREATE POLICY "Users can view their own posts"
ON posts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);