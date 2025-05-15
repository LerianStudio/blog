# building a multi-tenant financial ledger

in the world of financial systems, multi-tenancy is a critical architectural requirement. a properly implemented multi-tenant system ensures data isolation, security, and scalability while enabling efficient resource utilization. at midaz, we've built a comprehensive multi-tenant financial ledger system that addresses these concerns through a carefully designed hierarchical model.

this article explores our approach to multi-tenancy in the midaz financial ledger, the technical decisions we made, and the lessons we learned along the way.

## the multi-tenant hierarchy model

the foundation of our multi-tenant architecture is a hierarchical data model that clearly defines ownership and isolation boundaries. our hierarchy follows this structure:

1. **organizations** - the top-level tenant entity representing a business or institution
2. **ledgers** - financial books belonging to an organization
3. **portfolios** - collections of accounts within a ledger for logical grouping
4. **accounts** - individual financial entities that hold balances

this hierarchical model provides natural isolation boundaries while enabling flexible organization of financial data.

### organization as the tenant boundary

at midaz, we chose to use organizations as our primary tenant boundary. each organization represents a completely isolated tenant with its own data and access controls:

```go
// organization is the top-level entity in our multi-tenant hierarchy
type Organization struct {
    ID                 string      `json:"id"`
    ParentOrganizationID *string    `json:"parentOrganizationId"`
    LegalName          string      `json:"legalName"`
    DoingBusinessAs    *string     `json:"doingBusinessAs"`
    LegalDocument      string      `json:"legalDocument"`
    Address            Address     `json:"address"`
    Status             Status      `json:"status"`
    CreatedAt          time.Time   `json:"createdAt"`
    UpdatedAt          time.Time   `json:"updatedAt"`
    DeletedAt          *time.Time  `json:"deletedAt"`
    Metadata           map[string]any `json:"metadata,omitempty"`
}
```

several key attributes in this model support our multi-tenant approach:

1. **unique identifier**: each organization has a globally unique identifier (uuid)
2. **parent organization**: optional reference to a parent organization, enabling hierarchical tenant relationships
3. **metadata**: flexible key-value pairs for tenant-specific configuration
4. **legal document**: typically a tax id or registration number that helps ensure tenant uniqueness

this model allows for both flat multi-tenancy (independent organizations) and hierarchical multi-tenancy (parent-child relationships between organizations).

### ledgers for financial isolation

within each organization, we support multiple ledgers to provide further isolation of financial data:

```go
// ledger represents a financial book within an organization
type Ledger struct {
    ID             string      `json:"id"`
    Name           string      `json:"name"`
    OrganizationID string      `json:"organizationId"`
    Status         Status      `json:"status"`
    CreatedAt      time.Time   `json:"createdAt"`
    UpdatedAt      time.Time   `json:"updatedAt"`
    DeletedAt      *time.Time  `json:"deletedAt"`
    Metadata       map[string]any `json:"metadata,omitempty"`
}
```

the mandatory `OrganizationID` field establishes the tenant ownership relationship, ensuring that ledgers are always tied to exactly one organization. this allows us to implement strict access controls at the organization level while providing flexibility for organizations to maintain separate books for different purposes.

### portfolios for logical grouping

to further organize financial data within a ledger, we introduce portfolios:

```go
// portfolio represents a collection of accounts grouped for specific purposes
type Portfolio struct {
    ID             string      `json:"id"`
    Name           string      `json:"name"`
    EntityID       string      `json:"entityId,omitempty"`
    LedgerID       string      `json:"ledgerId"`
    OrganizationID string      `json:"organizationId"`
    Status         Status      `json:"status"`
    CreatedAt      time.Time   `json:"createdAt"`
    UpdatedAt      time.Time   `json:"updatedAt"`
    DeletedAt      *time.Time  `json:"deletedAt"`
    Metadata       map[string]any `json:"metadata,omitempty"`
}
```

portfolios maintain references to both their parent ledger (`LedgerID`) and the owning organization (`OrganizationID`). this dual reference might seem redundant, but it serves several important purposes:

1. it enables direct querying of portfolios by organization without joining through ledgers
2. it reinforces the ownership chain for validation and access control
3. it supports scenarios where portfolios might move between ledgers while staying within the same organization

### accounts as atomic financial entities

at the lowest level of our hierarchy are accounts:

```go
// account represents an individual financial entity
type Account struct {
    ID              string      `json:"id"`
    Name            string      `json:"name"`
    ParentAccountID *string     `json:"parentAccountId"`
    EntityID        *string     `json:"entityId"`
    AssetCode       string      `json:"assetCode"`
    OrganizationID  string      `json:"organizationId"`
    LedgerID        string      `json:"ledgerId"`
    PortfolioID     *string     `json:"portfolioId"`
    SegmentID       *string     `json:"segmentId"`
    Status          Status      `json:"status"`
    Alias           *string     `json:"alias"`
    Type            string      `json:"type"`
    CreatedAt       time.Time   `json:"createdAt"`
    UpdatedAt       time.Time   `json:"updatedAt"`
    DeletedAt       *time.Time  `json:"deletedAt"`
    Metadata        map[string]any `json:"metadata,omitempty"`
}
```

accounts maintain references to the entire hierarchy chain:
- `OrganizationID`: the owning tenant
- `LedgerID`: the ledger containing this account 
- `PortfolioID`: optional portfolio grouping

this comprehensive hierarchy reference enables efficient querying and robust access control at multiple levels.

## database implementation strategies

implementing multi-tenancy at the database level presents several options, each with trade-offs. we considered three main approaches:

### 1. separate databases per tenant

in this approach, each organization would have its own physical database.

**advantages**:
- complete physical isolation
- independent scaling of busy tenants
- simplified backup and recovery per tenant

**disadvantages**:
- higher operational complexity
- more expensive resource utilization
- limited ability to query across tenants

### 2. shared database, separate schemas

this approach uses a single database but separate schemas for each tenant.

**advantages**:
- logical isolation
- better resource utilization than separate databases
- simplified database maintenance

**disadvantages**:
- limited by database schema limits
- more complex connection pooling
- potential for cross-tenant query errors

### 3. shared database, shared schema

this approach uses a single database and schema with a tenant identifier column.

**advantages**:
- simplest operational model
- most efficient resource utilization
- easier to implement cross-tenant functionality
- unlimited tenant scaling

**disadvantages**:
- less isolation between tenants
- risk of data leakage if query filters are missed
- noisy neighbor potential

after careful consideration of our requirements, we chose the **shared database, shared schema** approach for midaz. this decision was based on several factors:

1. our need to support a large number of tenants efficiently
2. the requirement for consistent performance across tenants
3. simplified operations and maintenance
4. the ability to easily implement cross-tenant reporting for system administrators

to mitigate the risks of this approach, we implemented several safeguards:

## tenant isolation implementation

implementing strong tenant isolation in a shared schema environment requires multiple layers of protection.

### mandatory tenant filtering

all data access goes through repository implementations that enforce tenant isolation:

```go
// example ledger repository implementation with tenant isolation
func (r *LedgerRepository) GetByID(organizationID, ledgerID string) (*mmodel.Ledger, error) {
    // organization id is always required and enforced
    if organizationID == "" {
        return nil, errors.New("organization id is required")
    }
    
    var ledger mmodel.Ledger
    
    // query always filters by organization id
    result := r.db.Where("id = ? AND organization_id = ?", ledgerID, organizationID).First(&ledger)
    if result.Error != nil {
        return nil, result.Error
    }
    
    return &ledger, nil
}
```

similar patterns are used throughout our repository layer, ensuring that every query includes the appropriate tenant filter.

### middleware tenant context

to ensure tenant context is always available to our services, we implemented middleware that extracts and validates tenant information from requests:

```go
// tenant context middleware
func TenantContextMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // extract organization id from path or header
        orgID := c.Param("organizationId")
        if orgID == "" {
            orgID = c.GetHeader("X-Organization-ID")
        }
        
        if orgID == "" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "organization id is required"})
            c.Abort()
            return
        }
        
        // store in context for use by handlers
        c.Set("organizationID", orgID)
        
        // add to observability context for logging and tracing
        ctx := observability.WithBaggageItem(c.Request.Context(), "tenant", orgID)
        c.Request = c.Request.WithContext(ctx)
        
        c.Next()
    }
}
```

this middleware ensures that tenant context is always available and propagated through our system.

### database-level security controls

beyond application-level controls, we implemented database-level security:

1. **row-level security policies** that filter data based on the tenant id
2. **limited permission database roles** that prevent direct table access
3. **query monitoring** to detect and alert on potential cross-tenant queries

### tenant context propagation

ensuring tenant context propagates throughout the system, especially in asynchronous operations, is critical. we use context objects to carry tenant information:

```go
// example of tenant context propagation to an event handler
func (s *TransactionService) CreateTransaction(ctx context.Context, cmd CreateTransactionCommand) (*Transaction, error) {
    // extract tenant from context
    orgID, ok := organization.IDFromContext(ctx)
    if !ok {
        return nil, errors.New("organization id not found in context")
    }
    
    // create transaction
    tx, err := s.repository.Create(ctx, orgID, cmd)
    if err != nil {
        return nil, err
    }
    
    // propagate tenant context to event
    eventCtx := organization.NewContextWithID(ctx, orgID)
    s.eventBus.Publish(eventCtx, "transaction.created", tx)
    
    return tx, nil
}
```

this approach ensures that tenant context flows through all operations, including asynchronous event processing.

## handling tenant-specific customization

different tenants often require customization of the financial ledger's behavior. we address this through several mechanisms:

### metadata for tenant configuration

both organizations and other entities support a flexible metadata structure:

```go
// metadata allows tenant-specific configuration
Metadata map[string]any `json:"metadata"`
```

this provides a flexible extension point for tenant-specific configuration without schema changes. we use metadata for:

1. tenant-specific feature flags
2. custom business rules parameters
3. integration configuration
4. ui customization preferences

### tenant-specific plugins

for more complex customization needs, our plugin architecture allows tenant-specific behavior:

```go
// example of resolving a tenant-specific fee calculator
func (r *PluginRegistry) GetFeeCalculator(ctx context.Context) (FeeCalculator, error) {
    // get organization id from context
    orgID, ok := organization.IDFromContext(ctx)
    if !ok {
        return nil, errors.New("organization id not found in context")
    }
    
    // check for tenant-specific implementation
    if calculator, exists := r.tenantFeeCalculators[orgID]; exists {
        return calculator, nil
    }
    
    // fall back to default implementation
    return r.defaultFeeCalculator, nil
}
```

this pattern allows us to inject tenant-specific implementations of key interfaces without changing our core code.

## scaling a multi-tenant system

as our tenant base grew, we faced several scaling challenges:

### database scaling

a shared database approach creates specific scaling constraints:

1. **table size**: tables grow with the number of tenants and their data
2. **index efficiency**: tenant filtering requires careful index design
3. **query optimization**: queries must efficiently filter by tenant

we addressed these challenges through several techniques:

#### partitioning by tenant

for large tables, we implemented partitioning by tenant:

```sql
-- example of table partitioning by tenant hash
CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    ledger_id UUID NOT NULL,
    amount DECIMAL(19,4) NOT NULL,
    -- other fields
) PARTITION BY HASH (organization_id);

-- create 16 partitions
CREATE TABLE transactions_0 PARTITION OF transactions FOR VALUES WITH (modulus 16, remainder 0);
CREATE TABLE transactions_1 PARTITION OF transactions FOR VALUES WITH (modulus 16, remainder 1);
-- ... and so on
```

this approach improves query performance by limiting scans to relevant partitions and allows for better management of large tables.

#### tenant-aware indexes

all tables include the organization id in their indexes:

```sql
-- tenant-aware indexing strategy
CREATE INDEX idx_ledgers_org_id ON ledgers(organization_id);
CREATE INDEX idx_accounts_org_id_ledger_id ON accounts(organization_id, ledger_id);
CREATE INDEX idx_transactions_org_id_ledger_id_created ON transactions(organization_id, ledger_id, created_at DESC);
```

carefully designed composite indexes ensure efficient tenant filtering while supporting common query patterns.

### caching strategy

our caching strategy is tenant-aware to prevent data leakage and optimize cache utilization:

```go
// tenant-aware cache key generation
func generateCacheKey(orgID string, entity string, id string) string {
    return fmt.Sprintf("tenant:%s:entity:%s:id:%s", orgID, entity, id)
}

// tenant-aware cache retrieval
func (c *Cache) GetAccount(ctx context.Context, accountID string) (*Account, error) {
    orgID, ok := organization.IDFromContext(ctx)
    if !ok {
        return nil, errors.New("organization id not found in context")
    }
    
    key := generateCacheKey(orgID, "account", accountID)
    
    data, found := c.client.Get(key)
    if !found {
        return nil, errors.New("not found")
    }
    
    var account Account
    if err := json.Unmarshal(data.([]byte), &account); err != nil {
        return nil, err
    }
    
    return &account, nil
}
```

this approach ensures that caches:
1. maintain tenant isolation
2. optimize memory usage by including tenant in the key
3. enable tenant-specific cache invalidation

### tenant usage metrics

to identify scaling bottlenecks and noisy neighbors, we implemented comprehensive tenant usage metrics:

```go
// tenant metrics middleware
func TenantMetricsMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        orgID, exists := c.Get("organizationID")
        if !exists {
            c.Next()
            return
        }
        
        start := time.Now()
        
        // process request
        c.Next()
        
        // record metrics with tenant dimension
        duration := time.Since(start)
        metrics.RecordRequestDuration(orgID.(string), c.Request.Method, c.Status(), duration)
        metrics.IncrementRequestCount(orgID.(string), c.Request.Method, c.Status())
    }
}
```

these metrics help us:
1. identify tenants that need additional resources
2. detect abnormal usage patterns
3. provide usage-based billing information
4. plan capacity based on tenant growth patterns

## multi-tenant security considerations

security is particularly critical in a multi-tenant financial system. beyond basic tenant isolation, we implemented several additional security measures:

### tenant-specific encryption keys

sensitive data is encrypted with tenant-specific keys:

```go
// tenant-specific encryption service
func (s *EncryptionService) Encrypt(ctx context.Context, data []byte) ([]byte, error) {
    // get tenant-specific encryption key
    orgID, ok := organization.IDFromContext(ctx)
    if !ok {
        return nil, errors.New("organization id not found in context")
    }
    
    key, err := s.keyProvider.GetKey(orgID)
    if err != nil {
        return nil, err
    }
    
    // encrypt data with tenant-specific key
    return encrypt(data, key)
}
```

this ensures that even if data access controls are somehow bypassed, encrypted data remains protected by tenant-specific keys.

### tenant-specific rate limits

to prevent denial of service from a single tenant, we implement tenant-specific rate limits:

```go
// tenant-aware rate limiting
func TenantRateLimitMiddleware(limitPerSecond int) gin.HandlerFunc {
    limiters := sync.Map{}
    
    return func(c *gin.Context) {
        orgID, exists := c.Get("organizationID")
        if !exists {
            c.Next()
            return
        }
        
        // get or create rate limiter for this tenant
        limiterInterface, _ := limiters.LoadOrStore(orgID, rate.NewLimiter(rate.Limit(limitPerSecond), limitPerSecond))
        limiter := limiterInterface.(*rate.Limiter)
        
        if !limiter.Allow() {
            c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
            c.Abort()
            return
        }
        
        c.Next()
    }
}
```

this approach prevents a single tenant from affecting the performance of others.

## lessons learned

building and scaling a multi-tenant financial ledger taught us several valuable lessons:

1. **tenant id is sacred**: never allow a path where tenant filtering can be bypassed, even in internal services

2. **test tenant isolation explicitly**: our testing includes specific scenarios designed to verify tenant isolation is maintained

3. **tenant context must flow everywhere**: ensuring tenant context propagation through all system components, including asynchronous operations, is essential

4. **plan for tenant data migration**: as tenant needs evolve, the ability to migrate tenant data between different isolation models becomes important

5. **monitor tenant resource usage**: detecting and addressing "noisy neighbor" issues before they impact other tenants is critical for system reliability

## conclusion

building a multi-tenant financial ledger requires careful consideration of data modeling, isolation, scaling, and security. our approach at midaz leverages a hierarchical data model with organizations as the primary tenant boundary, implemented in a shared database with shared schema architecture.

this architecture has allowed us to scale efficiently while maintaining strong tenant isolation. by implementing multiple layers of protection—from mandatory tenant filtering to tenant-specific encryption—we've built a system that meets the strict security requirements of a financial platform.

as midaz continues to evolve, our multi-tenant architecture provides a solid foundation that enables us to efficiently serve diverse financial institutions with varying needs and scale requirements. 