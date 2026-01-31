# Password Reset Feature Documentation

## Overview
This feature allows users to reset their passwords if they forget them. The flow involves:
1. User requests password reset with their email
2. System generates a secure reset token and sends it via email
3. User clicks the link in the email and resets their password
4. User can log in with the new password

---

## API Endpoints

### 1. Request Password Reset
**Endpoint:** `POST /api/v1/users/forgot-password/`

**Description:** Request a password reset. An email with a reset link will be sent to the user.

**Request Body:**
```json
{
    "email": "user@example.com"
}
```

**Success Response (200 OK):**
```json
{
    "detail": "Password reset email sent. Please check your email."
}
```

**Error Responses:**
- **400 Bad Request** - Invalid email or email not found
- **500 Internal Server Error** - Failed to send email

**Example using cURL:**
```bash
curl -X POST http://localhost:8000/api/v1/users/forgot-password/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

**Example using Python requests:**
```python
import requests

response = requests.post(
    'http://localhost:8000/api/v1/users/forgot-password/',
    json={'email': 'user@example.com'}
)
print(response.json())
```

---

### 2. Reset Password
**Endpoint:** `POST /api/v1/users/reset-password/`

**Description:** Reset password using the token received in the email.

**Request Body:**
```json
{
    "email": "user@example.com",
    "token": "reset_token_from_email",
    "new_password": "newpassword123",
    "new_password_confirm": "newpassword123"
}
```

**Success Response (200 OK):**
```json
{
    "detail": "Password has been reset successfully. You can now log in with your new password."
}
```

**Error Responses:**
- **400 Bad Request** - Invalid token, expired token, passwords don't match, or user not found

**Example using cURL:**
```bash
curl -X POST http://localhost:8000/api/v1/users/reset-password/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "token": "your_reset_token_here",
    "new_password": "newpassword123",
    "new_password_confirm": "newpassword123"
  }'
```

**Example using Python requests:**
```python
import requests

response = requests.post(
    'http://localhost:8000/api/v1/users/reset-password/',
    json={
        'email': 'user@example.com',
        'token': 'your_reset_token_here',
        'new_password': 'newpassword123',
        'new_password_confirm': 'newpassword123'
    }
)
print(response.json())
```

---

## Environment Configuration

Add the following environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password  # Use app-specific password for Gmail
DEFAULT_FROM_EMAIL=noreply@healthcarediagnosis.com

# Frontend URL (for password reset links in emails)
FRONTEND_URL=http://localhost:3000
```

### Email Configuration Options

#### Using Gmail
1. Enable 2-Step Verification in Google Account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the app password in `EMAIL_HOST_PASSWORD`

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=xxxx xxxx xxxx xxxx  # 16-character app password
```

#### Using Development Mode (Console Output)
For testing without sending actual emails:

```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

This will print emails to the console instead of sending them.

#### Using Other SMTP Providers
Configure with your provider's SMTP settings:

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your_sendgrid_api_key
```

---

## Frontend Integration

### Step 1: Create Forgot Password Page
Create a page where users can enter their email:

```jsx
import { useState } from 'react';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(
        'http://localhost:8000/api/v1/users/forgot-password/',
        { email }
      );
      setMessage(response.data.detail);
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.email?.[0] || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-form">
      <h2>Forgot Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### Step 2: Create Reset Password Page
Create a page where users can enter their new password:

```jsx
import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    token: searchParams.get('token') || '',
    new_password: '',
    new_password_confirm: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await axios.post(
        'http://localhost:8000/api/v1/users/reset-password/',
        formData
      );
      setMessage(response.data.detail);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const errorData = err.response?.data;
      if (typeof errorData === 'object') {
        setError(Object.values(errorData)[0]?.[0] || 'An error occurred');
      } else {
        setError('An error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-form">
      <h2>Reset Password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          disabled
          required
        />
        <input
          type="hidden"
          name="token"
          value={formData.token}
        />
        <input
          type="password"
          name="new_password"
          placeholder="New Password"
          value={formData.new_password}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="new_password_confirm"
          placeholder="Confirm Password"
          value={formData.new_password_confirm}
          onChange={handleChange}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

### Step 3: Add Routes
```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Other routes */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Database Schema

### User Model Fields Added

```
reset_token (CharField, max_length=255, unique=True, nullable, blank)
    - Stores the unique password reset token
    - Automatically generated when password reset is requested
    - Cleared after successful password reset

reset_token_expires (DateTimeField, nullable, blank)
    - Stores the expiration time of the reset token
    - Tokens expire after 24 hours by default
    - Configurable in User.generate_reset_token(expires_in_hours)
```

---

## User Model Methods

### `generate_reset_token(expires_in_hours=24)`
Generates a unique password reset token for the user.

**Parameters:**
- `expires_in_hours` (int): Number of hours until token expires. Default: 24

**Returns:** The generated token string

**Example:**
```python
user = User.objects.get(email='user@example.com')
token = user.generate_reset_token(expires_in_hours=24)
```

### `verify_reset_token(token)`
Verifies if a token is valid and not expired.

**Parameters:**
- `token` (str): The token to verify

**Returns:** `True` if valid, `False` if invalid or expired

**Example:**
```python
user = User.objects.get(email='user@example.com')
is_valid = user.verify_reset_token('token_string')
```

### `clear_reset_token()`
Clears the reset token and expiration time (called after successful reset).

**Example:**
```python
user = User.objects.get(email='user@example.com')
user.clear_reset_token()
```

---

## Running Tests

Run the password reset tests:

```bash
# Run all password reset tests
python manage.py test apps.users.tests_password_reset

# Run specific test class
python manage.py test apps.users.tests_password_reset.ForgotPasswordTests

# Run specific test
python manage.py test apps.users.tests_password_reset.ForgotPasswordTests.test_forgot_password_valid_email

# Run with verbose output
python manage.py test apps.users.tests_password_reset -v 2
```

---

## Security Considerations

1. **Token Generation:** Uses Python's `secrets` module for cryptographically secure token generation
2. **Token Expiration:** Tokens expire after 24 hours (configurable)
3. **HTTPS:** Always use HTTPS in production to protect tokens in transit
4. **Email Verification:** Consider adding email verification before password reset
5. **Rate Limiting:** Consider implementing rate limiting on forgot-password endpoint to prevent abuse
6. **Logging:** All password reset attempts are logged via the activity system

---

## Troubleshooting

### Emails Not Sending

1. **Check EMAIL_BACKEND setting:**
   ```python
   # Development (console output)
   EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
   
   # Production (SMTP)
   EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
   ```

2. **Verify SMTP credentials:**
   ```bash
   python manage.py shell
   >>> from django.core.mail import send_mail
   >>> send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
   ```

3. **Check Django logs** for error messages

### Token Expiration Issues

If tokens are expiring too quickly or not at all, check:
- `settings.USE_TZ = True` (timezone support enabled)
- `settings.TIME_ZONE` is set correctly
- Database `reset_token_expires` values are stored correctly

### Database Migration Issues

If migration fails:

```bash
# Check migration status
python manage.py showmigrations users

# Apply specific migration
python manage.py migrate users 0002_user_password_reset

# Rollback if needed
python manage.py migrate users 0001_initial
```

---

## Future Enhancements

1. **Email Verification:** Add email verification step
2. **Rate Limiting:** Implement rate limiting on password reset requests
3. **OTP Codes:** Use one-time passwords instead of tokens
4. **Backup Codes:** Generate backup codes for account recovery
5. **Two-Factor Authentication:** Add 2FA support
6. **Password History:** Prevent reuse of recent passwords
7. **Login Alerts:** Notify users of failed login attempts
