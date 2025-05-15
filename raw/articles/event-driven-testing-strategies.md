# event-driven testing strategies for financial systems

financial systems are complex distributed environments where many operations happen asynchronously through events. testing such systems effectively requires specialized strategies that go beyond traditional unit and integration testing approaches. at midaz, we've developed comprehensive event-driven testing methodologies that help us ensure reliability across our distributed financial architecture.

this article explores the strategies, tools, and patterns we've implemented for testing event-driven components in our financial system.

## the challenge of testing event-driven systems

traditional testing approaches often fall short when applied to event-driven architectures. some key challenges we faced include:

1. **asynchronous operations**: events introduce time delays that make test flow control difficult
2. **message ordering**: events may arrive in different orders in test versus production
3. **event loss and duplication**: messaging systems can occasionally lose or duplicate messages
4. **distributed state**: system state is spread across multiple components
5. **eventual consistency**: state may not be immediately consistent after an operation

our approach needed to address these challenges while providing reliable test coverage and fast feedback cycles for developers.

## our layered testing approach

we've implemented a layered testing strategy that provides coverage at different levels of the system:

### 1. event unit testing

at the lowest level, we test individual event handlers in isolation. our event handler tests follow this pattern:

```go
// test for an event handler in the fees plugin
func TestFeeCalculationHandler(t *testing.T) {
    // set up the handler with mocked dependencies
    repository := mocks.NewMockFeeRepository(t)
    eventBus := mocks.NewMockEventBus(t)
    handler := fees.NewFeeCalculationHandler(repository, eventBus)
    
    // create a test event
    event := &events.TransactionCreatedEvent{
        ID:        "tx-123",
        AccountID: "acc-456",
        Amount:    decimal.NewFromFloat(100.0),
        Currency:  "USD",
        Timestamp: time.Now(),
    }
    
    // set up expectations
    repository.EXPECT().
        GetFeeRules(mock.Anything, "acc-456").
        Return([]fees.Rule{
            {
                Type:     "percentage",
                Value:    decimal.NewFromFloat(0.01),
                MinFee:   decimal.NewFromFloat(1.0),
                MaxFee:   decimal.NewFromFloat(10.0),
                Currency: "USD",
            },
        }, nil)
    
    expectedFee := decimal.NewFromFloat(1.0)
    
    eventBus.EXPECT().
        Publish(mock.Anything, "fees.calculated", mock.MatchedBy(func(e *events.FeeCalculatedEvent) bool {
            return e.TransactionID == "tx-123" && 
                   e.Amount.Equal(expectedFee) &&
                   e.Currency == "USD"
        })).
        Return(nil)
    
    // call the handler
    err := handler.Handle(context.Background(), event)
    
    // verify results
    assert.NoError(t, err)
}
```

this approach tests the business logic of individual event handlers but doesn't verify how events flow through the system.

### 2. event flow testing

to test how events propagate through multiple components, we've developed an in-memory event bus that maintains the same ordering guarantees as our production system:

```go
// in-memory event bus for testing
type TestEventBus struct {
    handlers map[string][]EventHandler
    events   map[string][]interface{}
    mu       sync.Mutex
}

func NewTestEventBus() *TestEventBus {
    return &TestEventBus{
        handlers: make(map[string][]EventHandler),
        events:   make(map[string][]interface{}),
    }
}

func (b *TestEventBus) Subscribe(topic string, handler EventHandler) error {
    b.mu.Lock()
    defer b.mu.Unlock()
    
    b.handlers[topic] = append(b.handlers[topic], handler)
    
    // replay any stored events for this topic
    for _, event := range b.events[topic] {
        go handler.Handle(context.Background(), event)
    }
    
    return nil
}

func (b *TestEventBus) Publish(ctx context.Context, topic string, event interface{}) error {
    b.mu.Lock()
    defer b.mu.Unlock()
    
    // store the event
    b.events[topic] = append(b.events[topic], event)
    
    // notify handlers
    for _, handler := range b.handlers[topic] {
        handler := handler // capture for goroutine
        go handler.Handle(ctx, event)
    }
    
    return nil
}

// wait for events to be processed
func (b *TestEventBus) WaitForEvents(timeout time.Duration) bool {
    // implementation that waits for all event processing to complete
    // or timeout to be reached
}
```

using this test event bus, we can verify complex event flows across multiple components:

```go
func TestTransactionFeeCalculationFlow(t *testing.T) {
    // set up test components with the test event bus
    bus := NewTestEventBus()
    
    transactionService := transaction.NewService(
        repository.NewTransactionRepository(db),
        bus,
    )
    
    feeService := fees.NewService(
        repository.NewFeeRepository(db),
        bus,
    )
    
    // initialize services
    transactionService.Initialize(context.Background())
    feeService.Initialize(context.Background())
    
    // trigger a transaction creation
    tx, err := transactionService.CreateTransaction(context.Background(), 
        transaction.CreateTransactionCommand{
            AccountID: "acc-123",
            Amount:    decimal.NewFromFloat(200.0),
            Currency:  "USD",
        },
    )
    
    assert.NoError(t, err)
    
    // wait for events to be processed
    completed := bus.WaitForEvents(5 * time.Second)
    assert.True(t, completed, "event processing timed out")
    
    // verify fee was calculated and applied
    updatedTx, err := transactionService.GetTransaction(context.Background(), tx.ID)
    assert.NoError(t, err)
    
    assert.Equal(t, "calculated", updatedTx.FeeStatus)
    assert.Equal(t, decimal.NewFromFloat(2.0), updatedTx.FeeAmount)
}
```

this approach tests the interaction between components but still runs in a controlled environment.

### 3. event sourcing tests

for services that use event sourcing, we've developed specialized testing tools that verify the correct sequence of events is generated and applied:

```go
func TestAccountEventSourcing(t *testing.T) {
    // create a test event store
    eventStore := eventsourcing.NewInMemoryEventStore()
    
    // create the account aggregate
    account := account.NewAccount("acc-123", "USD")
    
    // apply commands to the aggregate
    err := account.Deposit(decimal.NewFromFloat(100.0))
    assert.NoError(t, err)
    
    err = account.Withdraw(decimal.NewFromFloat(30.0))
    assert.NoError(t, err)
    
    // save events to the store
    err = eventStore.SaveEvents(account.ID, account.Changes(), -1)
    assert.NoError(t, err)
    
    // verify the events
    events, err := eventStore.GetEvents(account.ID)
    assert.NoError(t, err)
    
    assert.Len(t, events, 3) // created, deposited, withdrawn
    
    assert.Equal(t, "account.created", events[0].Type)
    assert.Equal(t, "account.deposited", events[1].Type)
    assert.Equal(t, "account.withdrawn", events[2].Type)
    
    // rebuild the aggregate from events
    newAccount := account.NewAccount("acc-123", "")
    err = newAccount.LoadFromHistory(events)
    assert.NoError(t, err)
    
    // verify state was correctly rebuilt
    assert.Equal(t, decimal.NewFromFloat(70.0), newAccount.Balance())
    assert.Equal(t, "USD", newAccount.Currency())
}
```

this approach ensures that our event sourcing logic correctly captures and replays system state.

### 4. cqrs testing

for our command query responsibility segregation (cqrs) components, we've developed a testing approach that verifies command handlers generate the correct events and read models are properly updated:

```go
func TestTransactionCommandHandler(t *testing.T) {
    // set up test dependencies
    eventBus := NewTestEventBus()
    store := NewInMemoryEventStore()
    
    // create command and query sides
    commandHandler := commands.NewTransactionCommandHandler(store, eventBus)
    readModel := query.NewTransactionReadModel(store, eventBus)
    
    // initialize read model
    readModel.Initialize(context.Background())
    
    // execute a command
    cmd := commands.CreateTransactionCommand{
        AccountID: "acc-123",
        Amount:    decimal.NewFromFloat(100.0),
        Currency:  "USD",
    }
    
    result, err := commandHandler.Handle(context.Background(), cmd)
    assert.NoError(t, err)
    
    txID := result.(string)
    
    // wait for events to be processed
    eventBus.WaitForEvents(2 * time.Second)
    
    // query the read model
    tx, err := readModel.GetTransactionByID(context.Background(), txID)
    assert.NoError(t, err)
    
    // verify read model was updated correctly
    assert.Equal(t, "acc-123", tx.AccountID)
    assert.Equal(t, decimal.NewFromFloat(100.0), tx.Amount)
    assert.Equal(t, "USD", tx.Currency)
    assert.Equal(t, "completed", tx.Status)
}
```

this approach ensures that our command and query components work together correctly.

## integration with the midaz testing framework

to make these testing patterns easily available to developers, we've integrated them into our testing framework:

```go
// TestContext provides a unified context for event-driven tests
type TestContext struct {
    EventBus    *TestEventBus
    EventStore  *TestEventStore
    SnapshotStore *TestSnapshotStore
    DB          *TestDB
    Context     context.Context
    t           *testing.T
}

func NewTestContext(t *testing.T) *TestContext {
    ctx := context.Background()
    
    // create the test context with all required components
    return &TestContext{
        EventBus:      NewTestEventBus(),
        EventStore:    NewTestEventStore(),
        SnapshotStore: NewTestSnapshotStore(),
        DB:            NewTestDB(),
        Context:       ctx,
        t:             t,
    }
}

// CreateService creates a service with the test context
func (tc *TestContext) CreateService(serviceType string) interface{} {
    switch serviceType {
    case "transaction":
        return transaction.NewService(
            repository.NewTransactionRepository(tc.DB),
            tc.EventBus,
            tc.EventStore,
        )
    case "account":
        return account.NewService(
            repository.NewAccountRepository(tc.DB),
            tc.EventBus,
            tc.EventStore,
        )
    case "fee":
        return fees.NewService(
            repository.NewFeeRepository(tc.DB),
            tc.EventBus,
        )
    default:
        tc.t.Fatalf("unknown service type: %s", serviceType)
        return nil
    }
}

// WaitForEvents waits for all events to be processed
func (tc *TestContext) WaitForEvents(timeout time.Duration) bool {
    return tc.EventBus.WaitForEvents(timeout)
}

// AssertEventPublished asserts that an event of the given type was published
func (tc *TestContext) AssertEventPublished(topic string, matcher func(interface{}) bool) {
    tc.EventBus.AssertEventPublished(tc.t, topic, matcher)
}
```

this framework simplifies writing event-driven tests and ensures consistent testing patterns across our codebase:

```go
func TestCompleteTransactionFlow(t *testing.T) {
    // create test context
    tc := NewTestContext(t)
    
    // create services
    txService := tc.CreateService("transaction").(transaction.Service)
    accountService := tc.CreateService("account").(account.Service)
    feeService := tc.CreateService("fee").(fees.Service)
    
    // initialize services
    txService.Initialize(tc.Context)
    accountService.Initialize(tc.Context)
    feeService.Initialize(tc.Context)
    
    // create test account
    account, err := accountService.CreateAccount(tc.Context, account.CreateAccountCommand{
        Currency: "USD",
        Type:     "checking",
    })
    assert.NoError(t, err)
    
    // create transaction
    tx, err := txService.CreateTransaction(tc.Context, transaction.CreateTransactionCommand{
        AccountID: account.ID,
        Amount:    decimal.NewFromFloat(100.0),
        Currency:  "USD",
    })
    assert.NoError(t, err)
    
    // wait for events to be processed
    tc.WaitForEvents(5 * time.Second)
    
    // assert events were published
    tc.AssertEventPublished("transaction.created", func(e interface{}) bool {
        event := e.(*events.TransactionCreatedEvent)
        return event.ID == tx.ID
    })
    
    tc.AssertEventPublished("fees.calculated", func(e interface{}) bool {
        event := e.(*events.FeeCalculatedEvent)
        return event.TransactionID == tx.ID
    })
    
    // verify final state
    updatedTx, err := txService.GetTransaction(tc.Context, tx.ID)
    assert.NoError(t, err)
    assert.Equal(t, "completed", updatedTx.Status)
    
    updatedAccount, err := accountService.GetAccount(tc.Context, account.ID)
    assert.NoError(t, err)
    assert.Equal(t, decimal.NewFromFloat(100.0), updatedAccount.Balance)
}
```

## testing event retries and error handling

a critical aspect of event-driven systems is handling failures and retries. we've developed specific testing patterns for these scenarios:

```go
func TestEventRetries(t *testing.T) {
    // create test context with failing components
    tc := NewTestContext(t)
    
    // create a repository that will fail on first attempt
    failingRepo := NewFailingRepository(1) // fail first attempt
    
    // create service with failing repository
    service := transaction.NewService(
        failingRepo,
        tc.EventBus,
        tc.EventStore,
    )
    
    // initialize service
    service.Initialize(tc.Context)
    
    // create transaction (this will trigger events)
    tx, err := service.CreateTransaction(tc.Context, transaction.CreateTransactionCommand{
        AccountID: "acc-123",
        Amount:    decimal.NewFromFloat(100.0),
        Currency:  "USD",
    })
    assert.NoError(t, err)
    
    // wait for initial processing and retry
    tc.WaitForEvents(10 * time.Second)
    
    // verify transaction was eventually processed despite failure
    updatedTx, err := service.GetTransaction(tc.Context, tx.ID)
    assert.NoError(t, err)
    assert.Equal(t, "completed", updatedTx.Status)
    
    // verify retry metrics
    assert.Equal(t, int64(1), tc.GetMetricValue("transaction.retry.count"))
}
```

## performance testing for event processing

for performance-critical event flows, we've developed specialized testing tools that verify our system can handle the required event throughput:

```go
func TestTransactionThroughput(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping throughput test in short mode")
    }
    
    // create test context
    tc := NewTestContext(t)
    
    // create services
    txService := tc.CreateService("transaction").(transaction.Service)
    txService.Initialize(tc.Context)
    
    // metrics collection
    var completedCount int64
    var errorCount int64
    
    // create many transactions in parallel
    const transactionCount = 1000
    const concurrency = 10
    
    var wg sync.WaitGroup
    limiter := make(chan struct{}, concurrency)
    
    startTime := time.Now()
    
    for i := 0; i < transactionCount; i++ {
        wg.Add(1)
        limiter <- struct{}{}
        
        go func(i int) {
            defer wg.Done()
            defer func() { <-limiter }()
            
            _, err := txService.CreateTransaction(tc.Context, transaction.CreateTransactionCommand{
                AccountID: fmt.Sprintf("acc-%d", i % 100), // use 100 different accounts
                Amount:    decimal.NewFromFloat(float64(i % 1000) + 0.99),
                Currency:  "USD",
            })
            
            if err != nil {
                atomic.AddInt64(&errorCount, 1)
            } else {
                atomic.AddInt64(&completedCount, 1)
            }
        }(i)
    }
    
    // wait for all goroutines to complete
    wg.Wait()
    
    // wait for events to be processed
    tc.WaitForEvents(30 * time.Second)
    
    duration := time.Since(startTime)
    
    // calculate throughput
    throughput := float64(completedCount) / duration.Seconds()
    
    // assert minimum throughput
    minThroughput := 100.0 // transactions per second
    assert.GreaterOrEqual(t, throughput, minThroughput, 
        "throughput too low: %.2f tps (expected >= %.2f)", throughput, minThroughput)
    
    // assert error rate within acceptable limits
    maxErrorRate := 0.01 // 1%
    errorRate := float64(errorCount) / float64(transactionCount)
    assert.LessOrEqual(t, errorRate, maxErrorRate,
        "error rate too high: %.2f%% (expected <= %.2f%%)", 
        errorRate * 100, maxErrorRate * 100)
}
```

## end-to-end testing with event monitoring

for complete system testing, we deploy a test environment with all components and use our observability tools to monitor event flows:

```go
func TestCompleteSystem(t *testing.T) {
    if testing.Short() {
        t.Skip("skipping system test in short mode")
    }
    
    // connect to test environment
    client := midaz.NewClient(
        midaz.WithBaseURL(testEnvURL),
        midaz.WithAuthToken(testAuthToken),
    )
    
    // create test data
    org, err := client.Organizations.Create(context.Background(), organizations.CreateOrganizationRequest{
        Name: "Test Organization",
    })
    assert.NoError(t, err)
    
    ledger, err := client.Ledgers.Create(context.Background(), ledgers.CreateLedgerRequest{
        OrganizationID: org.ID,
        Name:           "Test Ledger",
    })
    assert.NoError(t, err)
    
    account, err := client.Accounts.Create(context.Background(), accounts.CreateAccountRequest{
        OrganizationID: org.ID,
        LedgerID:       ledger.ID,
        Name:           "Test Account",
        Currency:       "USD",
    })
    assert.NoError(t, err)
    
    // create transaction
    tx, err := client.Transactions.Create(context.Background(), transactions.CreateTransactionRequest{
        OrganizationID: org.ID,
        LedgerID:       ledger.ID,
        AccountID:      account.ID,
        Amount:         "100.00",
        Currency:       "USD",
    })
    assert.NoError(t, err)
    
    // monitor events in the system
    observer := observability.NewSystemObserver(testEnvURL + "/events")
    
    // wait for all expected events
    completed := observer.WaitForEvents(tx.ID, []string{
        "transaction.created",
        "account.updated",
        "fees.calculated",
        "transaction.completed",
    }, 30 * time.Second)
    
    assert.True(t, completed, "not all expected events were observed")
    
    // verify final system state
    updatedTx, err := client.Transactions.Get(context.Background(), transactions.GetTransactionRequest{
        OrganizationID: org.ID,
        LedgerID:       ledger.ID,
        TransactionID:  tx.ID,
    })
    assert.NoError(t, err)
    assert.Equal(t, "completed", updatedTx.Status)
    
    updatedAccount, err := client.Accounts.Get(context.Background(), accounts.GetAccountRequest{
        OrganizationID: org.ID,
        LedgerID:       ledger.ID,
        AccountID:      account.ID,
    })
    assert.NoError(t, err)
    assert.Equal(t, "100.00", updatedAccount.Balance)
}
```

## test data generation

to support our event-driven tests, we've developed tools for generating realistic test data:

```go
// TransactionGenerator creates realistic test transactions
type TransactionGenerator struct {
    client       *midaz.Client
    accountCache map[string]*accounts.Account
}

// NewTransactionGenerator creates a new transaction generator
func NewTransactionGenerator(client *midaz.Client) *TransactionGenerator {
    return &TransactionGenerator{
        client:       client,
        accountCache: make(map[string]*accounts.Account),
    }
}

// GenerateRandomTransactions generates random transactions
func (g *TransactionGenerator) GenerateRandomTransactions(
    ctx context.Context,
    orgID, ledgerID string,
    count int,
) ([]*transactions.Transaction, error) {
    // implementation that generates realistic test transactions
    // using account cache for efficiency
}
```

## lessons learned

our journey with event-driven testing has taught us several valuable lessons:

1. **design for testability**: event-driven systems must be designed with testing in mind from the start

2. **isolate time dependencies**: time is a major challenge in event testing; isolating time dependencies makes tests more reliable

3. **make test failures deterministic**: random test failures are hard to debug; ensure tests fail consistently or not at all

4. **use real event formats**: test with the exact same event formats used in production to avoid translation issues

5. **invest in test infrastructure**: good test infrastructure pays dividends in development velocity and system reliability

## conclusion

testing event-driven financial systems requires specialized approaches that address the unique challenges of distributed, asynchronous architectures. by developing a comprehensive testing framework that supports various testing patterns and integrates with our observability tools, we've been able to build a reliable financial platform that can evolve rapidly while maintaining high quality standards.

our event-driven testing strategies have become a cornerstone of our development process, allowing us to deliver new features with confidence and maintain the reliability that financial systems demand. as our system continues to evolve, our testing approach will also grow to address new challenges and ensure we can detect and prevent issues before they affect our users. 