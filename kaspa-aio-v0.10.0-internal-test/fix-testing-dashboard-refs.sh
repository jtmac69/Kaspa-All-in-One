#!/bin/bash
# Script to remove dashboard references from TESTING.md

FILE="TESTING.md"
BACKUP="${FILE}.backup-$(date +%Y%m%d-%H%M%S)"

# Create backup
cp "$FILE" "$BACKUP"
echo "Created backup: $BACKUP"

# Remove dashboard from port requirements
sed -i 's/  - `8080`: Management dashboard/  - ~~`8080`: Management dashboard~~ (not included in test release)/' "$FILE"

# Replace dashboard access instructions with docker ps
sed -i 's/Check the dashboard at `http:\/\/localhost:8080`/Check services with `docker ps`/' "$FILE"
sed -i 's/Verify services are running.*dashboard at.*8080/Verify services are running with `docker ps`/' "$FILE"

# Remove dashboard access steps
sed -i '/#### Step.*: Verify Dashboard Access/,/^\*\*🐛 If Something Goes Wrong\*\*:/d' "$FILE"

# Remove dashboard links from completion steps
sed -i 's/Should show link to Dashboard: `http:\/\/localhost:8080`/~~Dashboard link~~ (dashboard not included in test release)/' "$FILE"
sed -i '/Click on the Dashboard link/d' "$FILE"
sed -i 's/Open the dashboard at `http:\/\/localhost:8080`/Use `docker ps` to check service status/' "$FILE"
sed -i 's/Go back to dashboard at `http:\/\/localhost:8080`/Check services with `docker ps`/' "$FILE"
sed -i 's/Open dashboard: `http:\/\/localhost:8080`/Check services: `docker ps`/' "$FILE"

# Remove dashboard from tested features
sed -i 's/- ✅ Dashboard access and service monitoring/- ✅ Service monitoring with `docker ps` and `docker logs`/' "$FILE"
sed -i 's/- \*\*Dashboard usefulness\*\*: ⭐⭐⭐⭐⭐/- \*\*Service monitoring tools\*\*: ⭐⭐⭐⭐⭐/' "$FILE"

# Remove dashboard troubleshooting
sed -i '/Dashboard doesn.*t load:/d' "$FILE"
sed -i '/Check if port 8080 is accessible/d' "$FILE"

# Add note about dashboard not being included
sed -i '/^Once installation completes:/a\\n**Note**: The management dashboard is not included in this test release. Use `docker ps` to check service status and `docker logs <container-name>` to view logs.' "$FILE"

echo "Dashboard references updated in $FILE"
echo "Review the changes and delete the backup if satisfied"
