# secure api design in financial systems

when building financial systems, security isn't just a feature—it's a fundamental requirement that must be woven into every aspect of the system. nowhere is this more critical than in api design, where a single vulnerability can compromise the entire system. at midaz, we've developed a comprehensive approach to secure api design that balances security, usability, and performance.

this article explores the principles, patterns, and practices we've adopted to ensure our apis are both secure and effective.

## fundamental security principles

our approach to secure api design is built on several core principles:

1. **defense in depth**: implementing multiple layers of security controls
2. **least privilege**: limiting access to the minimum required
3. **secure by default**: choosing secure options as defaults
4. **fail securely**: ensuring failures don't compromise security
5. **economy of mechanism**: keeping security designs as simple as possible
6. **complete mediation**: checking every access attempt
7. **open design**: not relying on security through obscurity

these principles guide all our api design decisions, from authentication mechanisms to error handling.

## authentication and authorization

authentication and authorization form the cornerstone of api security. we've implemented a comprehensive approach based on modern standards and best practices.

### authentication strategies

we considered several authentication mechanisms when designing our apis:

1. **api keys**: simple but limited in terms of granularity and management
2. **basic authentication**: too limited for a complex financial system
3. **session-based authentication**: problematic for stateless apis
4. **jwt-based authentication**: offers good balance of security and usability
5. **oauth 2.0 and openid connect**: provides comprehensive identity and access management

after careful evaluation, we implemented oauth 2.0 with openid connect as our primary authentication mechanism, with support for client certificates in high-security contexts.

```go
// middleware to validate jwt tokens
func JWTAuthMiddleware(jwksURL string) gin.HandlerFunc {
    keyProvider := auth.NewRemoteKeyProvider(jwksURL)
    
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatus(http.StatusUnauthorized)
            return
        }
        
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.AbortWithStatus(http.StatusUnauthorized)
            return
        }
        
        token := parts[1]
        claims, err := auth.ValidateToken(token, keyProvider)
        if err != nil {
            c.AbortWithStatus(http.StatusUnauthorized)
            return
        }
        
        // store validated claims in context
        c.Set("claims", claims)
        c.Next()
    }
}
```

this approach gives us:

1. **delegation of authentication**: identity providers handle the complexities of authentication
2. **token-based validation**: simplifies api gateway implementation
3. **standard claims**: consistent user information across services
4. **integration with identity providers**: supports social and enterprise identity sources
5. **scope-based authorization**: fine-grained control over permissions

### authorization framework

authentication tells us who the user is, but authorization determines what they can do. we implemented a comprehensive authorization framework:

```go
// permission-based authorization middleware
func AuthorizePermission(permission string) gin.HandlerFunc {
    return func(c *gin.Context) {
        claims, exists := c.Get("claims")
        if !exists {
            c.AbortWithStatus(http.StatusUnauthorized)
            return
        }
        
        userPermissions := extractPermissions(claims.(auth.Claims))
        if !hasPermission(userPermissions, permission) {
            c.AbortWithStatus(http.StatusForbidden)
            return
        }
        
        c.Next()
    }
}

// role-based authorization middleware
func AuthorizeRole(role string) gin.HandlerFunc {
    return func(c *gin.Context) {
        claims, exists := c.Get("claims")
        if !exists {
            c.AbortWithStatus(http.StatusUnauthorized)
            return
        }
        
        userRoles := extractRoles(claims.(auth.Claims))
        if !hasRole(userRoles, role) {
            c.AbortWithStatus(http.StatusForbidden)
            return
        }
        
        c.Next()
    }
}
```

our authorization system combines:

1. **role-based access control (rbac)**: assigning permissions to roles, and roles to users
2. **attribute-based access control (abac)**: using user and resource attributes for fine-grained decisions
3. **context-based rules**: incorporating time, location, and other contextual factors
4. **resource-level permissions**: controlling access to specific resources
5. **action-level permissions**: controlling what actions can be performed

## secure api endpoints

beyond authentication and authorization, we've implemented comprehensive security measures at the api endpoint level.

### input validation

one of the most critical aspects of api security is thorough input validation. we validate all input at multiple levels:

```go
// transaction creation endpoint with validation
func CreateTransaction(c *gin.Context) {
    // 1. parse and validate request structure
    var req CreateTransactionRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        handleValidationError(c, err)
        return
    }
    
    // 2. deep validation of business rules
    validator := validation.New()
    if err := validator.Struct(req); err != nil {
        handleValidationError(c, err)
        return
    }
    
    // 3. context-aware validation
    if err := validateTransactionContext(c, req); err != nil {
        handleBusinessError(c, err)
        return
    }
    
    // process valid transaction
    result, err := transactionService.Create(c.Request.Context(), req.ToCommand())
    if err != nil {
        handleServiceError(c, err)
        return
    }
    
    c.JSON(http.StatusCreated, result)
}
```

our validation strategy includes:

1. **structural validation**: ensuring the request has the correct format and data types
2. **semantic validation**: verifying business rules and constraints
3. **contextual validation**: checking the request in the context of the current state
4. **cross-field validation**: validating relationships between different fields
5. **sanitization**: cleansing input to prevent injection attacks

### rate limiting and throttling

to protect against denial of service and brute force attacks, we've implemented comprehensive rate limiting:

```go
// rate limiting middleware with different tiers
func RateLimitMiddleware(store RateLimitStore) gin.HandlerFunc {
    return func(c *gin.Context) {
        // identify the client
        clientID := extractClientID(c)
        
        // determine rate limit tier
        tier := determineTier(clientID)
        
        // apply rate limit
        limited, err := store.CheckRateLimit(clientID, tier)
        if err != nil {
            c.AbortWithStatus(http.StatusInternalServerError)
            return
        }
        
        if limited {
            c.Header("Retry-After", "60")
            c.AbortWithStatus(http.StatusTooManyRequests)
            return
        }
        
        c.Next()
    }
}
```

our rate limiting approach includes:

1. **tiered rate limits**: different limits for different user categories
2. **adaptive throttling**: dynamically adjusting limits based on system load
3. **distributed rate limiting**: consistent enforcement across multiple api instances
4. **per-endpoint limits**: varying limits based on endpoint sensitivity
5. **client identification**: reliably identifying clients even in proxy environments

### secure response handling

api responses can inadvertently leak sensitive information. we've implemented patterns to ensure secure response handling:

```go
// secure response handling
func handleServiceError(c *gin.Context, err error) {
    // log detailed error for internal use
    logger.Error("service error", zap.Error(err))
    
    // map to appropriate response without leaking details
    switch {
    case errors.Is(err, domain.ErrNotFound):
        c.JSON(http.StatusNotFound, ErrorResponse{
            Code: "NOT_FOUND",
            Message: "The requested resource was not found",
        })
    case errors.Is(err, domain.ErrValidation):
        c.JSON(http.StatusBadRequest, ErrorResponse{
            Code: "VALIDATION_ERROR",
            Message: "The request data is invalid",
        })
    case errors.Is(err, domain.ErrUnauthorized):
        c.JSON(http.StatusForbidden, ErrorResponse{
            Code: "FORBIDDEN",
            Message: "You don't have permission to perform this action",
        })
    default:
        // don't expose internal errors
        c.JSON(http.StatusInternalServerError, ErrorResponse{
            Code: "INTERNAL_ERROR",
            Message: "An internal error occurred",
        })
    }
}
```

our response security approach includes:

1. **error normalization**: consistent error responses without internal details
2. **data minimization**: including only necessary information in responses
3. **sensitive data filtering**: removing or masking sensitive fields
4. **response validation**: ensuring responses meet security requirements
5. **metadata protection**: careful control of headers and metadata

## protecting sensitive data

financial apis handle highly sensitive data that requires special protection.

### data encryption

we implement encryption at multiple levels:

1. **transport encryption**: all api communications use tls 1.3 with modern cipher suites
2. **field-level encryption**: sensitive fields are encrypted even within the system
3. **tokenization**: replacing sensitive data with non-sensitive tokens
4. **key management**: comprehensive key rotation and management procedures

```go
// field-level encryption for sensitive data
func (s *TransactionService) Create(ctx context.Context, cmd CreateTransactionCommand) (*Transaction, error) {
    // encrypt sensitive payment information before storage
    if cmd.PaymentMethod != nil {
        encryptedData, err := s.encryption.Encrypt(
            ctx,
            cmd.PaymentMethod.CardNumber,
            encryption.WithContext("transaction", "payment_method"),
        )
        if err != nil {
            return nil, err
        }
        
        // store encrypted data and clear sensitive fields
        cmd.PaymentMethod.EncryptedCardNumber = encryptedData
        cmd.PaymentMethod.CardNumber = ""
    }
    
    // proceed with creation
    return s.repository.Create(ctx, cmd.ToEntity())
}
```

### data masking

even authorized users often don't need to see complete sensitive information. we implement data masking for these scenarios:

```go
// response data masking
func maskAccountNumber(accountNumber string) string {
    if len(accountNumber) <= 4 {
        return accountNumber
    }
    
    masked := strings.Repeat("*", len(accountNumber)-4)
    return masked + accountNumber[len(accountNumber)-4:]
}

func (a *AccountDTO) MarshalJSON() ([]byte, error) {
    type Alias AccountDTO
    
    return json.Marshal(&struct {
        *Alias
        Number string `json:"number"`
    }{
        Alias:  (*Alias)(a),
        Number: maskAccountNumber(a.Number),
    })
}
```

### sensitive data handling

beyond encryption and masking, we have comprehensive policies for sensitive data:

1. **data classification**: categorizing data based on sensitivity
2. **data minimization**: collecting and storing only necessary data
3. **retention policies**: automatically purging data when no longer needed
4. **access logging**: recording all access to sensitive data
5. **secure data disposal**: ensuring complete removal when deleted

## api security headers and configurations

proper http headers play a critical role in api security:

```go
// security headers middleware
func SecurityHeadersMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // prevent browsers from interpreting files as a different MIME type
        c.Header("X-Content-Type-Options", "nosniff")
        
        // protect against clickjacking
        c.Header("X-Frame-Options", "DENY")
        
        // enable the XSS filter built into modern browsers
        c.Header("X-XSS-Protection", "1; mode=block")
        
        // prevent all loading of resources from external domains
        c.Header("Content-Security-Policy", "default-src 'self'")
        
        // disable caching for sensitive data
        c.Header("Cache-Control", "no-store, max-age=0")
        
        // strict transport security
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
        
        c.Next()
    }
}
```

we also implement api gateway configurations for additional security:

1. **tls configuration**: modern versions, strong ciphers, perfect forward secrecy
2. **cors policies**: strict cross-origin resource sharing settings
3. **request filtering**: blocking potentially malicious patterns
4. **response transformation**: sanitizing responses before delivery
5. **timeout policies**: preventing long-running requests

## idempotency and transaction safety

financial operations must be idempotent to prevent duplicate transactions. we implement comprehensive idempotency support:

```go
// idempotency key middleware
func IdempotencyMiddleware(store IdempotencyStore) gin.HandlerFunc {
    return func(c *gin.Context) {
        // only apply to state-changing methods
        if c.Request.Method == "GET" || c.Request.Method == "HEAD" {
            c.Next()
            return
        }
        
        // require idempotency key for mutations
        key := c.GetHeader("Idempotency-Key")
        if key == "" {
            c.JSON(http.StatusBadRequest, ErrorResponse{
                Code: "MISSING_IDEMPOTENCY_KEY",
                Message: "Idempotency-Key header is required",
            })
            c.Abort()
            return
        }
        
        // check for existing response
        existingResponse, err := store.GetResponse(c.Request.Context(), key)
        if err != nil {
            c.AbortWithStatus(http.StatusInternalServerError)
            return
        }
        
        if existingResponse != nil {
            // return cached response for idempotent request
            c.Data(existingResponse.StatusCode, existingResponse.ContentType, existingResponse.Body)
            c.Abort()
            return
        }
        
        // mark key as in-progress
        if err := store.SetInProgress(c.Request.Context(), key); err != nil {
            c.AbortWithStatus(http.StatusInternalServerError)
            return
        }
        
        // capture response to store for future duplicate requests
        c.Writer = newResponseWriter(c.Writer)
        
        c.Next()
        
        // store response for idempotency
        if !c.IsAborted() {
            rw := c.Writer.(*responseWriter)
            err := store.StoreResponse(c.Request.Context(), key, &Response{
                StatusCode:  rw.Status(),
                ContentType: rw.Header().Get("Content-Type"),
                Body:        rw.Body(),
            })
            if err != nil {
                logger.Error("failed to store idempotent response", zap.Error(err))
            }
        }
    }
}
```

this approach ensures that repeated identical requests produce the same result without duplicate operations.

## audit logging and monitoring

comprehensive logging and monitoring are essential for security:

```go
// audit logging middleware
func AuditLoggingMiddleware(auditLogger *AuditLogger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        
        // extract user information
        userID := extractUserID(c)
        clientIP := c.ClientIP()
        
        // prepare audit entry
        entry := &AuditEntry{
            Timestamp:  start,
            UserID:     userID,
            ClientIP:   clientIP,
            Method:     c.Request.Method,
            Path:       c.Request.URL.Path,
            Query:      c.Request.URL.RawQuery,
            UserAgent:  c.Request.UserAgent(),
            RequestID:  c.GetHeader("X-Request-ID"),
        }
        
        // capture request body if appropriate
        if shouldCaptureRequestBody(c) {
            body, _ := io.ReadAll(c.Request.Body)
            c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
            entry.RequestBody = sanitizeRequestBody(c, body)
        }
        
        // process request
        c.Next()
        
        // finalize audit entry
        entry.StatusCode = c.Writer.Status()
        entry.Duration = time.Since(start)
        
        // capture response if appropriate
        if writer, ok := c.Writer.(*responseWriter); ok && shouldCaptureResponseBody(c) {
            entry.ResponseBody = sanitizeResponseBody(c, writer.Body())
        }
        
        // record audit entry
        auditLogger.Log(c.Request.Context(), entry)
    }
}
```

our logging and monitoring strategy includes:

1. **comprehensive audit trails**: logging all security-relevant events
2. **separation of concerns**: distinct operational and security logs
3. **tamper-evident logging**: ensuring logs cannot be modified
4. **real-time alerting**: immediate notification of suspicious activities
5. **log analysis**: identifying patterns and potential attacks

## cross-cutting security concerns

beyond these specific areas, we address several cross-cutting security concerns:

### api versioning

secure api design must consider versioning to avoid breaking changes while maintaining security:

```go
// api versioning middleware
func VersioningMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        version := c.GetHeader("API-Version")
        if version == "" {
            // default to latest version if not specified
            version = "v2"
        }
        
        // validate version
        if !isValidVersion(version) {
            c.JSON(http.StatusBadRequest, ErrorResponse{
                Code: "INVALID_VERSION",
                Message: "Invalid API version specified",
            })
            c.Abort()
            return
        }
        
        // store version for handlers
        c.Set("api_version", version)
        
        // add version to response headers
        c.Header("API-Version", version)
        
        c.Next()
    }
}
```

our versioning approach maintains backward compatibility while allowing security enhancements.

### api documentation and security

we maintain comprehensive api documentation that includes security requirements:

1. **openapi specifications**: detailed api documentation with security schemes
2. **security requirements**: clearly documented security expectations 
3. **error response documentation**: comprehensive documentation of error cases
4. **security examples**: sample code for implementing security correctly
5. **compliance notes**: documentation of regulatory compliance aspects

### security testing

our api security is continuously validated through comprehensive testing:

1. **automated security scanning**: regular scanning for vulnerabilities
2. **penetration testing**: regular tests by security professionals
3. **fuzz testing**: testing with random and unexpected inputs
4. **compliance validation**: checking against security standards
5. **dependency scanning**: monitoring for vulnerabilities in dependencies

## lessons learned

our journey in secure api design has taught us several important lessons:

1. **security is a process, not a product**: ongoing vigilance and improvement are essential

2. **usability matters**: security measures that are too cumbersome will be bypassed or resisted

3. **defense in depth works**: multiple security layers have repeatedly prevented potential breaches

4. **automate security wherever possible**: human error is a major security risk

5. **monitor and respond**: even the best security will be tested, so detection and response are critical

## conclusion

secure api design in financial systems requires a comprehensive approach that addresses authentication, authorization, data protection, and numerous other concerns. by implementing defense in depth with multiple security layers, we've created apis that protect sensitive financial data while remaining usable and performant.

our approach balances security with usability, recognizing that security measures that interfere with legitimate use will ultimately be circumvented. by carefully designing security into every aspect of our apis, we've created a system that is both secure and effective.

as threats continue to evolve, so too will our security approach. by maintaining vigilance, continuously testing, and applying lessons learned, we ensure that our financial apis remain protected against current and emerging threats. 