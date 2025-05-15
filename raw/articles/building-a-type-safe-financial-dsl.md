# building a type-safe financial dsl: from design to implementation

financial systems are inherently complex, with numerous rules, constraints, and behaviors that must be carefully expressed in code. when we began developing midaz, we quickly realized that general-purpose programming constructs alone wouldn't provide the clarity and safety needed for financial operations. this led us to develop a domain-specific language (dsl) that would allow us to express financial operations with precision while leveraging the type systems of go and typescript to catch errors at compile time.

## why a domain-specific language?

traditional approaches to financial system development often result in complex, error-prone code that's difficult to reason about. we considered several alternatives before settling on a dsl approach:

- using raw sql or orm queries directly: this approach lacks domain semantics and type safety for financial operations
- implementing operations as generic function calls: loses the specific semantics of financial operations
- creating a verbose object-based api: increases boilerplate and doesn't leverage compiler checking effectively

our dsl approach offers significant advantages:

- domain experts can understand and sometimes author the operations
- the compiler catches errors that would otherwise only appear at runtime
- operations are self-documenting and express intent clearly
- we gain performance optimizations specific to our problem domain
- testing becomes more straightforward and targeted

## designing the type system

at the core of our dsl is a carefully crafted type system that models financial concepts. this was perhaps the most critical decision in our implementation journey.

our type system had to capture essential financial concepts while remaining flexible enough to accommodate various use cases. key types include:

```go
// account represents a financial account in the system
type Account struct {
    ID          string
    Number      string
    Currency    Currency
    Type        AccountType
    Balance     Money
    Constraints []Constraint
}

// money represents a monetary amount in a specific currency
type Money struct {
    Amount   *big.Decimal
    Currency Currency
}

// transaction represents a financial transaction
type Transaction struct {
    ID          string
    Entries     []Entry
    Metadata    map[string]string
    Timestamp   time.Time
    Status      TransactionStatus
}

// entry represents a single entry in a transaction
type Entry struct {
    AccountID string
    Amount    Money
    Type      EntryType
}
```

the key insight here was designing a type system that enforces:

1. transactions must balance (sum of debits equals sum of credits)
2. operations must respect currency constraints
3. account balances must stay within defined limits
4. transactions must satisfy temporal constraints (e.g., settlement dates)

we achieved this through a combination of structural typing and runtime validation, but with compile-time guarantees wherever possible.

## building the expression system

with our type system in place, we needed a way to express operations on these types. our expression system follows a composable, fluent pattern:

```typescript
// example of our typescript dsl for creating a transfer between accounts
const transaction = new Transaction()
  .withEntry(account1, Money.debit(amount, "USD"))
  .withEntry(account2, Money.credit(amount, "USD"))
  .withMetadata("purpose", "monthly transfer")
  .build();
```

in our go implementation, we use method chaining with clear semantics:

```go
// example of our go dsl for creating a transfer between accounts
tx, err := transaction.New().
    WithDebit(account1.ID, decimal.NewFromFloat(100.0), "USD").
    WithCredit(account2.ID, decimal.NewFromFloat(100.0), "USD").
    WithMetadata("purpose", "monthly transfer").
    Build(ctx)
```

the expression system needed to be both expressive and restrictive—allowing valid operations while making invalid operations impossible to represent. this is where the true power of a type-safe dsl shines.

## compile-time validation

one of our primary goals was shifting as many validations as possible from runtime to compile time. this approach has numerous benefits:

- errors are caught earlier in the development cycle
- fewer runtime checks means better performance
- security vulnerabilities from invalid states are reduced
- less defensive coding is needed throughout the codebase

in our go implementation, we leverage the compiler through strategic use of interfaces and method chains:

```go
// this pattern ensures transaction building follows a specific sequence
type TransactionBuilder interface {
    WithDebit(accountID string, amount decimal.Decimal, currency string) TransactionBuilderWithEntry
    WithCredit(accountID string, amount decimal.Decimal, currency string) TransactionBuilderWithEntry
}

type TransactionBuilderWithEntry interface {
    WithDebit(accountID string, amount decimal.Decimal, currency string) TransactionBuilderWithEntry
    WithCredit(accountID string, amount decimal.Decimal, currency string) TransactionBuilderWithEntry
    WithMetadata(key, value string) TransactionBuilderWithEntry
    Build(ctx context.Context) (*Transaction, error)
}
```

in typescript, we leverage its advanced type system features like discriminated unions and conditional types:

```typescript
// typescript dsl leveraging advanced type features
type TransactionWithEntries<E extends Entry[]> = {
  entries: E;
  isBalanced: IsBalanced<E> extends true ? true : false;
}

// conditional type that checks if entries are balanced
type IsBalanced<E extends Entry[]> = SumOfDebits<E> extends SumOfCredits<E> ? true : false;
```

## runtime validation

despite our efforts to push validation to compile time, some checks can only be performed at runtime. for these cases, we implemented a comprehensive validation system:

```go
// runtime validation system for transactions
func (v *Validator) ValidateTransaction(ctx context.Context, tx *Transaction) error {
    // Check transaction has at least two entries
    if len(tx.Entries) < 2 {
        return errors.New("transaction must have at least two entries")
    }

    // Check transaction is balanced
    if !v.isBalanced(tx) {
        return errors.New("transaction must be balanced")
    }

    // Check account constraints
    if err := v.checkAccountConstraints(ctx, tx); err != nil {
        return err
    }

    return nil
}
```

we carefully considered where to place validations:

- simple structural validations happen at build time
- complex balance validations occur before persistence
- account constraint validations happen during execution
- temporal validations occur at the appropriate phase of the transaction lifecycle

## integration with the wider system

a dsl cannot exist in isolation—it must integrate with the broader system. our dsl needed to work seamlessly with:

- persistence layers for storing and retrieving financial data
- event systems for triggering workflows and notifications
- api layers for external integration
- reporting systems for analytics and compliance

we achieved this through a clean architecture approach where the dsl operates at the domain level, with adapters for various infrastructure concerns:

```go
// example of integrating our dsl with the persistence layer
func (r *TransactionRepository) Save(ctx context.Context, tx *Transaction) error {
    // Convert domain object to persistence model
    ptx := &persistence.Transaction{
        ID:        tx.ID,
        Status:    string(tx.Status),
        Timestamp: tx.Timestamp,
        Metadata:  tx.Metadata,
    }

    for _, entry := range tx.Entries {
        ptx.Entries = append(ptx.Entries, persistence.Entry{
            AccountID: entry.AccountID,
            Amount:    entry.Amount.Amount.String(),
            Currency:  string(entry.Amount.Currency),
            Type:      string(entry.Type),
        })
    }

    // Persist to database
    return r.db.Save(ctx, ptx)
}
```

## versioning and evolution

financial systems evolve, requiring the dsl to evolve as well. we needed a strategy for versioning and evolving our language without breaking existing code.

our approach involves:

1. backward compatibility guarantees for core operations
2. explicit versioning of the dsl api
3. gradual deprecation of outdated constructs
4. migration tools for updating client code

for example, when we needed to add support for multi-currency transactions, we designed the api extension to be backward compatible:

```typescript
// original api (still supported)
const simpleTx = new Transaction()
  .withEntry(account1, Money.debit(100, "USD"))
  .withEntry(account2, Money.credit(100, "USD"))
  .build();

// extended api for multi-currency
const multicurrencyTx = new Transaction()
  .withEntry(account1, Money.debit(100, "USD"))
  .withEntry(account3, Money.credit(90, "EUR"))
  .withExchangeRate("USD", "EUR", "0.9")
  .build();
```

## performance considerations

performance is critical in financial systems, and our dsl needed to be efficient. we made several optimizations:

1. minimal object allocations in hot paths
2. efficient validation algorithms
3. specialized implementations for common operations
4. optimized serialization/deserialization
5. caching of frequently accessed data

for example, our money type uses a specialized decimal implementation that's optimized for financial calculations:

```go
// optimized decimal operations for financial calculations
func (m Money) Add(other Money) (Money, error) {
    if m.Currency != other.Currency {
        return Money{}, errors.New("cannot add different currencies")
    }

    return Money{
        Amount:   decimal.Sum(m.Amount, other.Amount),
        Currency: m.Currency,
    }, nil
}

func (m Money) Multiply(factor decimal.Decimal) Money {
    return Money{
        Amount:   decimal.Mul(m.Amount, factor),
        Currency: m.Currency,
    }
}
```

## lessons learned

developing a type-safe financial dsl taught us several valuable lessons:

1. **start with the domain, not the syntax**: we initially focused too much on creating an elegant syntax rather than modeling the domain correctly. once we shifted focus to domain modeling, the syntax followed naturally.

2. **type safety requires thoughtful design**: achieving meaningful type safety wasn't just about using a typed language; it required careful design of types and interfaces to encode business rules.

3. **balance compile-time and runtime checks**: while we pushed as much as possible to compile time, trying to encode everything in the type system led to overly complex types. finding the right balance was key.

4. **consider the learning curve**: a dsl should make common operations simpler, not more complex. we sometimes erred on the side of too much abstraction, making the learning curve steeper than necessary.

5. **test the boundaries**: some of our most insidious bugs occurred at the boundaries between the dsl and other system components. extensive integration testing was essential.

## conclusion

building a type-safe financial dsl has been transformative for our development process at midaz. it has reduced errors, improved developer productivity, and made our code more maintainable.

the journey from design to implementation involved careful consideration of type systems, expression design, validation strategies, and integration patterns. by pushing validation to compile time where possible, we've created a safer, more robust system.

while the development of a domain-specific language requires significant investment, the returns in terms of code quality, developer experience, and system reliability have made it worthwhile for our financial system needs.

the type-safe dsl continues to evolve as we encounter new requirements and edge cases, but the core design principles have proven solid and adaptable to our changing needs. 