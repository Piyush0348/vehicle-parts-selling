using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Cryptography;
using AutoServe.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var jwtKey = builder.Configuration["JwtSettings:Key"];
var key = Encoding.UTF8.GetBytes(jwtKey!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateLifetime = true
    };
});

builder.Services.AddAuthorization();

builder.Services.Configure<ExternalServicesOptions>(
    builder.Configuration.GetSection("ExternalServices"));

builder.Services.Configure<EmailOptions>(
    builder.Configuration.GetSection("Email"));

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IOrderService, OrderService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    SeedDefaultUsers(db);
}

app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

static void SeedDefaultUsers(AppDbContext db)
{
    var defaults = new[]
    {
        new { FirstName = "Auto", LastName = "Admin", Email = "admin@autoserve.local", Phone = "9800000101", Password = "Admin@123", Role = "Admin" },
        new { FirstName = "Auto", LastName = "Staff", Email = "staff@autoserve.local", Phone = "9800000102", Password = "Staff@123", Role = "Staff" },
        new { FirstName = "Auto", LastName = "Customer", Email = "customer@autoserve.local", Phone = "9800000103", Password = "Customer@123", Role = "Customer" }
    };

    var changed = false;

    foreach (var user in defaults)
    {
        var email = user.Email.ToLowerInvariant();
        var existing = db.Customers.FirstOrDefault(c => c.Email.ToLower() == email);
        var hash = HashPassword(user.Password);

        if (existing == null)
        {
            db.Customers.Add(new Customer
            {
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = email,
                Phone = user.Phone,
                PasswordHash = hash,
                Role = user.Role
            });
            changed = true;
            continue;
        }

        if (existing.PasswordHash != hash || existing.Role != user.Role)
        {
            existing.PasswordHash = hash;
            existing.Role = user.Role;
            if (string.IsNullOrWhiteSpace(existing.Phone))
                existing.Phone = user.Phone;
            changed = true;
        }
    }

    if (changed)
        db.SaveChanges();
}

static string HashPassword(string password)
{
    using var sha = SHA256.Create();
    return Convert.ToBase64String(sha.ComputeHash(Encoding.UTF8.GetBytes(password)));
}