# building a clean architecture console with next.js

modern financial systems require robust, maintainable, and scalable user interfaces. when building the midaz console, we faced the challenge of creating a complex frontend application that could evolve alongside our backend services while maintaining separation of concerns. our solution was to apply clean architecture principles to our next.js application.

this article explores how we implemented clean architecture in our frontend, the challenges we faced, and the benefits we've realized.

## understanding clean architecture in frontend development

clean architecture, originally described by robert c. martin, promotes separation of concerns through a layered approach. traditionally applied to backend development, we adapted these principles for our frontend console:

1. **entities**: core business objects independent of any ui concerns
2. **use cases**: application-specific business rules
3. **interface adapters**: converting between use cases and external frameworks
4. **frameworks and drivers**: external tools and frameworks (next.js, react, etc.)

implementing clean architecture in a frontend context required careful consideration of where to draw boundaries and how to handle the inherently stateful nature of ui development.

## directory structure and organization

our first step was establishing a directory structure that reflects clean architecture principles:

```
midaz-console/
├── src/
│   ├── domain/           # Entities and business logic
│   │   ├── models/
│   │   ├── repositories/
│   │   └── services/
│   ├── application/      # Use cases
│   │   ├── services/
│   │   ├── ports/
│   │   └── dtos/
│   ├── infrastructure/   # External interfaces
│   │   ├── api/
│   │   ├── storage/
│   │   └── auth/
│   ├── presentation/     # UI components
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   └── pages/
│   └── utils/            # Utilities and helpers
```

this structure allows us to separate core business logic from presentation concerns, making the codebase more maintainable and testable.

## domain layer: the heart of the application

at the core of our application is the domain layer, which contains our business entities and logic independent of any ui or external framework:

```typescript
// domain/models/account.ts
export interface Account {
  id: string;
  number: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: Money;
  status: AccountStatus;
}

// domain/services/accountService.ts
export interface AccountService {
  getAccounts(filters: AccountFilters): Promise<Account[]>;
  getAccountById(id: string): Promise<Account>;
  createAccount(account: CreateAccountData): Promise<Account>;
  updateAccount(id: string, data: UpdateAccountData): Promise<Account>;
}
```

by defining our core domain models and service interfaces at this level, we establish a stable foundation that remains consistent even as ui components and external integrations change.

## application layer: orchestrating business operations

the application layer contains use cases that orchestrate domain entities to fulfill specific application requirements:

```typescript
// application/services/accountApplicationService.ts
export class AccountApplicationService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly authorizationService: AuthorizationService,
    private readonly eventEmitter: EventEmitter
  ) {}

  async getAccounts(userId: string, filters: AccountFilters): Promise<AccountDTO[]> {
    await this.authorizationService.validateAccess(userId, 'accounts', 'read');
    const accounts = await this.accountRepository.findByFilters(filters);
    
    this.eventEmitter.emit('accounts.listed', { userId, filters });
    
    return accounts.map(account => this.mapToDTO(account));
  }
  
  private mapToDTO(account: Account): AccountDTO {
    // Transform domain entity to DTO for the presentation layer
    return {
      id: account.id,
      number: account.number,
      name: account.name,
      type: account.type,
      currency: account.currency,
      balance: {
        amount: account.balance.amount.toString(),
        currency: account.balance.currency
      },
      status: account.status
    };
  }
}
```

this layer acts as a mediator between the domain and the outside world, handling concerns like authorization, event emission, and data transformation.

## infrastructure layer: bridging external systems

the infrastructure layer handles communication with external systems, such as apis, storage, and authentication:

```typescript
// infrastructure/api/accountApi.ts
export class AccountApiRepository implements AccountRepository {
  constructor(private readonly apiClient: ApiClient) {}

  async findByFilters(filters: AccountFilters): Promise<Account[]> {
    const response = await this.apiClient.get('/accounts', { params: filters });
    return response.data.map(this.mapToAccount);
  }

  async findById(id: string): Promise<Account> {
    const response = await this.apiClient.get(`/accounts/${id}`);
    return this.mapToAccount(response.data);
  }
  
  private mapToAccount(data: any): Account {
    return {
      id: data.id,
      number: data.number,
      name: data.name,
      type: data.type as AccountType,
      currency: data.currency,
      balance: {
        amount: new Decimal(data.balance.amount),
        currency: data.balance.currency
      },
      status: data.status as AccountStatus
    };
  }
}
```

this layer adapts external data formats to our domain models, isolating the rest of the application from changes in api formats or external services.

## presentation layer: delivering the user experience

the presentation layer contains react components, hooks, and contexts that provide the user interface:

```typescript
// presentation/hooks/useAccounts.ts
export function useAccounts(filters: AccountFilters) {
  const accountService = useAccountService();
  const [accounts, setAccounts] = useState<AccountDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    accountService.getAccounts(filters)
      .then(data => {
        if (isMounted) {
          setAccounts(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [accountService, filters]);

  return { accounts, loading, error };
}

// presentation/components/AccountList.tsx
export function AccountList({ filters }: AccountListProps) {
  const { accounts, loading, error } = useAccounts(filters);

  if (loading) return <Spinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <Table>
      <TableHeader>
        <TableCell>Account Number</TableCell>
        <TableCell>Name</TableCell>
        <TableCell>Type</TableCell>
        <TableCell>Balance</TableCell>
      </TableHeader>
      <TableBody>
        {accounts.map(account => (
          <TableRow key={account.id}>
            <TableCell>{account.number}</TableCell>
            <TableCell>{account.name}</TableCell>
            <TableCell>{account.type}</TableCell>
            <TableCell>
              {formatMoney(account.balance.amount, account.balance.currency)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

this layer focuses on presenting data to users and capturing user input, delegating business logic to the application and domain layers.

## dependency injection: managing dependencies

a key aspect of clean architecture is dependency inversion. we implemented this using a simple dependency injection container:

```typescript
// infrastructure/di/container.ts
export class Container {
  private services: Map<string, any> = new Map();

  register<T>(token: string, instance: T): void {
    this.services.set(token, instance);
  }

  resolve<T>(token: string): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service ${token} not registered`);
    }
    return service as T;
  }
}

// setup.ts
const container = new Container();

// Register infrastructure implementations
container.register('ApiClient', new ApiClient(config.apiUrl));
container.register('AccountRepository', new AccountApiRepository(container.resolve('ApiClient')));
container.register('AuthorizationService', new ApiAuthorizationService(container.resolve('ApiClient')));

// Register application services
container.register('AccountService', new AccountApplicationService(
  container.resolve('AccountRepository'),
  container.resolve('AuthorizationService'),
  container.resolve('EventEmitter')
));

// Create a hook for components to access services
export function useAccountService() {
  return container.resolve<AccountApplicationService>('AccountService');
}
```

this approach allows us to easily swap implementations and isolate components for testing.

## state management: clean architecture approach

state management in react applications can quickly become complex. we applied clean architecture principles to our state management strategy:

1. **domain state**: managed by domain services, represents core business state
2. **application state**: managed by application services, represents application-specific state
3. **ui state**: managed by components or hooks, represents purely ui-related state

this separation allows us to handle different types of state with appropriate tools:

```typescript
// application/services/accountStateService.ts
export class AccountStateService {
  private accounts = atom<Account[]>({
    key: 'accounts',
    default: []
  });

  getAccountsAtom() {
    return this.accounts;
  }

  async refreshAccounts(filters: AccountFilters) {
    const accountService = this.container.resolve<AccountService>('AccountService');
    const accounts = await accountService.getAccounts(filters);
    this.setAccounts(accounts);
  }

  private setAccounts(accounts: Account[]) {
    set(this.accounts, accounts);
  }
}

// presentation/hooks/useAccountState.ts
export function useAccountState(filters: AccountFilters) {
  const accountStateService = useAccountStateService();
  const accounts = useRecoilValue(accountStateService.getAccountsAtom());
  
  useEffect(() => {
    accountStateService.refreshAccounts(filters);
  }, [accountStateService, filters]);
  
  return accounts;
}
```

this approach keeps business logic out of components while still providing reactive state updates.

## integrating with next.js

next.js provides features like server-side rendering and api routes that require special consideration in a clean architecture. our approach was to treat next.js as part of the infrastructure layer, adapting it to our architecture rather than the reverse:

```typescript
// pages/accounts/[id].tsx
export default function AccountDetailsPage({ initialData }: AccountDetailsPageProps) {
  return (
    <AccountDetailsContainer initialData={initialData} />
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const accountId = context.params?.id as string;
  const container = getServerContainer();
  const accountService = container.resolve<AccountService>('AccountService');
  
  try {
    const account = await accountService.getAccountById(accountId);
    return {
      props: {
        initialData: account
      }
    };
  } catch (error) {
    return {
      notFound: true
    };
  }
};

// presentation/containers/AccountDetailsContainer.tsx
export function AccountDetailsContainer({ initialData }: AccountDetailsContainerProps) {
  const accountService = useAccountService();
  const [account, setAccount] = useState<AccountDTO>(initialData);
  
  // Component logic here
  
  return (
    <AccountDetails account={account} onUpdate={handleUpdate} />
  );
}
```

this pattern allows us to leverage next.js features while maintaining clean architecture separation.

## testing strategy

clean architecture naturally promotes testability by separating concerns. our testing strategy reflects this:

1. **domain tests**: unit tests for domain entities and services
2. **application tests**: unit tests for application services with mocked dependencies
3. **infrastructure tests**: integration tests for repositories and external services
4. **presentation tests**: component tests using react testing library
5. **e2e tests**: end-to-end tests using playwright

for example, testing an application service:

```typescript
// application/services/__tests__/accountApplicationService.test.ts
describe('AccountApplicationService', () => {
  let accountRepository: jest.Mocked<AccountRepository>;
  let authorizationService: jest.Mocked<AuthorizationService>;
  let eventEmitter: jest.Mocked<EventEmitter>;
  let service: AccountApplicationService;
  
  beforeEach(() => {
    accountRepository = {
      findByFilters: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    } as any;
    
    authorizationService = {
      validateAccess: jest.fn().mockResolvedValue(true)
    } as any;
    
    eventEmitter = {
      emit: jest.fn()
    } as any;
    
    service = new AccountApplicationService(
      accountRepository,
      authorizationService,
      eventEmitter
    );
  });
  
  describe('getAccounts', () => {
    it('should validate user access before retrieving accounts', async () => {
      accountRepository.findByFilters.mockResolvedValue([]);
      
      await service.getAccounts('user123', {});
      
      expect(authorizationService.validateAccess).toHaveBeenCalledWith(
        'user123', 'accounts', 'read'
      );
    });
    
    it('should return mapped account DTOs', async () => {
      const mockAccounts = [
        {
          id: 'acc1',
          number: '1001',
          name: 'Checking',
          type: 'CHECKING',
          currency: 'USD',
          balance: { amount: new Decimal(1000), currency: 'USD' },
          status: 'ACTIVE'
        }
      ];
      
      accountRepository.findByFilters.mockResolvedValue(mockAccounts);
      
      const result = await service.getAccounts('user123', {});
      
      expect(result).toEqual([
        {
          id: 'acc1',
          number: '1001',
          name: 'Checking',
          type: 'CHECKING',
          currency: 'USD',
          balance: { amount: '1000', currency: 'USD' },
          status: 'ACTIVE'
        }
      ]);
    });
  });
});
```

this testing approach has resulted in a highly testable codebase with good coverage across all layers.

## challenges and solutions

implementing clean architecture in our next.js console wasn't without challenges:

### 1. handling react state within clean architecture

**challenge**: react's component model encourages local state management, which can conflict with clean architecture principles.

**solution**: we established clear boundaries for state management, using domain and application services for business state and limiting component state to ui-specific concerns.

### 2. server-side rendering with clean architecture

**challenge**: next.js's server-side rendering model can blur the lines between frontend and backend code.

**solution**: we treated server-side code as part of the infrastructure layer, with clear adapters that convert between next.js patterns and our application services.

### 3. balancing pragmatism and purity

**challenge**: strict adherence to clean architecture can lead to excessive abstraction and boilerplate.

**solution**: we applied the principles pragmatically, focusing on the boundaries that provided the most value while allowing some flexibility in less critical areas.

### 4. managing asynchronous operations

**challenge**: frontend applications are inherently asynchronous, which can complicate clean architecture implementation.

**solution**: we standardized our approach to async operations with consistent patterns for loading states, error handling, and cancellation, implemented at the application layer.

## benefits realized

despite these challenges, implementing clean architecture in our console has delivered significant benefits:

1. **maintainability**: clear separation of concerns has made the codebase easier to understand and modify
2. **testability**: isolated components with clear dependencies are significantly easier to test
3. **adaptability**: we've been able to change ui frameworks and external apis with minimal impact on business logic
4. **scalability**: the architecture has scaled well as the application has grown in complexity
5. **onboarding**: new developers can understand and contribute to specific areas without needing to understand the entire system

## lessons learned

our journey with clean architecture in the frontend has taught us several valuable lessons:

1. **start with domain modeling**: getting the core domain models right is critical to the success of the architecture

2. **be pragmatic about boundaries**: not every component needs the full clean architecture treatment; focus on establishing boundaries where they provide the most value

3. **invest in developer experience**: clean architecture can introduce complexity, so invest in tooling and documentation to make development smooth

4. **evolve gradually**: refactor toward clean architecture incrementally rather than attempting a big-bang rewrite

5. **adapt to the frontend context**: clean architecture principles need adaptation for frontend concerns like component lifecycle and user interaction

## conclusion

building our midaz console with clean architecture and next.js has proven to be a successful approach. by separating concerns into distinct layers, we've created a maintainable, testable, and adaptable frontend application that can evolve alongside our backend services.

while implementing clean architecture in a frontend context presents unique challenges, the benefits in terms of code organization, testability, and maintainability have made it worthwhile. our approach has enabled us to build a complex financial console that can grow and adapt to changing requirements while maintaining a high level of quality.

as we continue to evolve the midaz console, we're focusing on refining our architecture, improving our developer experience, and exploring how to better integrate with emerging frontend patterns and technologies while maintaining the clean architecture principles that have served us well. 