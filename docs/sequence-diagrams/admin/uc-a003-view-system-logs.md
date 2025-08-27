# UC-A003: View System Logs - Sequence Diagram

```mermaid
sequenceDiagram
    participant Admin
    participant AdminDashboard
    participant LoggingService
    participant PostgreSQL
    participant Redis
    participant FileSystem

    Admin->>AdminDashboard: Request system logs
    AdminDashboard->>Admin: Show filter options
    Admin->>AdminDashboard: Set filters (date, level, component)
    
    AdminDashboard->>LoggingService: Query logs with filters
    LoggingService->>PostgreSQL: Search persistent log entries
    LoggingService->>Redis: Get recent real-time logs
    LoggingService->>FileSystem: Read archived log files
    
    PostgreSQL-->>LoggingService: Historical log data
    Redis-->>LoggingService: Recent activity logs
    FileSystem-->>LoggingService: Archived logs
    
    LoggingService->>LoggingService: Merge PostgreSQL, Redis, and file logs
    LoggingService-->>AdminDashboard: Filtered log entries
    AdminDashboard-->>Admin: Display logs with timestamps

    opt Export logs
        Admin->>AdminDashboard: Request export
        AdminDashboard->>LoggingService: Generate export
        LoggingService->>LoggingService: Format logs for export
        LoggingService-->>AdminDashboard: Export file
        AdminDashboard-->>Admin: Download export file
        
        alt Export fails
            LoggingService-->>AdminDashboard: Export error
            AdminDashboard-->>Admin: Show error, suggest retry
        end
    end

    alt No logs match criteria
        LoggingService-->>AdminDashboard: Empty result
        AdminDashboard-->>Admin: Show "No logs found"
    end
```