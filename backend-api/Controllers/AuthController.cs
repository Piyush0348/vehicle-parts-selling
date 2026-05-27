using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpGet("hash")]
    public IActionResult GetHash([FromQuery] string password)
    {
        return Ok(new { hash = Hash(password) });
    }

    [HttpPost("register")]
    public IActionResult Register(RegisterDto dto)
    {
        var email = dto.Email.Trim().ToLower();
        if (_context.Customers.Any(x => x.Email.ToLower() == email))
            return BadRequest("Email already exists");

        var customer = new Customer
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = email,
            PasswordHash = Hash(dto.Password.Trim()),
            Role = "Customer"
        };

        _context.Customers.Add(customer);
        _context.SaveChanges();

        return Ok(new
        {
            message = "Registered successfully",
            customer.Id,
            customer.Email
        });
    }

    [HttpPost("login")]
    public IActionResult Login(LoginDto dto)
    {
        var email = dto.Email.Trim().ToLower();
        var user = _context.Customers.FirstOrDefault(x => x.Email.ToLower() == email);

        if (user == null)
            return Unauthorized("Invalid credentials");

        // Check if password matches either hashed or plain text (for seeded users)
        // We trim the password as well in case of accidental spaces in the Seed.sql
        var cleanPassword = dto.Password.Trim();
        bool isPasswordValid = user.PasswordHash == Hash(cleanPassword) || user.PasswordHash == cleanPassword;

        if (!isPasswordValid)
            return Unauthorized("Invalid credentials");

        var jwtKey = _configuration["JwtSettings:Key"];
        var key = Encoding.UTF8.GetBytes(jwtKey!);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(2),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return Ok(new
        {
            token = tokenHandler.WriteToken(token),
            role = user.Role
        });
    }


    private string Hash(string password)
    {
        using var sha = SHA256.Create();
        return Convert.ToBase64String(
            sha.ComputeHash(Encoding.UTF8.GetBytes(password))
        );
    }
}