# UC-A005: Generate Reports - Sequence Diagram

```mermaid
sequenceDiagram
    participant Admin
    participant AdminDashboard
    participant ReportService
    participant Database
    participant FileSystem
    participant AuditLog

    Admin->>AdminDashboard: Access reports section
    AdminDashboard-->>Admin: Show report options
    Admin->>AdminDashboard: Select report type & date range
    Note over Admin: player activity, room statistics, performance metrics
    
    AdminDashboard->>ReportService: Generate report request
    ReportService->>Database: Query player data
    ReportService->>Database: Query room statistics
    ReportService->>Database: Query performance metrics
    
    Database-->>ReportService: Player activity data
    Database-->>ReportService: Room statistics
    Database-->>ReportService: Performance data
    
    ReportService->>ReportService: Process and aggregate data
    
    alt Sufficient data
        ReportService->>ReportService: Generate report
        ReportService->>AuditLog: Log report generation
        ReportService-->>AdminDashboard: Report ready
        AdminDashboard-->>Admin: Show report preview
        
        Admin->>AdminDashboard: Choose download format (PDF/CSV/JSON)
        AdminDashboard->>ReportService: Format report
        ReportService->>FileSystem: Create download file
        FileSystem-->>ReportService: File created
        ReportService-->>AdminDashboard: Download link
        AdminDashboard-->>Admin: Provide download
        
        alt Download fails
            FileSystem-->>ReportService: File creation error
            ReportService-->>AdminDashboard: Download error
            AdminDashboard-->>Admin: Offer alternative methods
        end
    else Insufficient data
        ReportService-->>AdminDashboard: Warning with partial data
        AdminDashboard-->>Admin: Show warning and partial report
    end
```