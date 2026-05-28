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
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .SetIsOriginAllowed(_ => true)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

var jwtKey = builder.Configuration["JwtSettings:Key"];
var key    = Encoding.UTF8.GetBytes(jwtKey!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken            = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = false,
        ValidateAudience         = false,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey         = new SymmetricSecurityKey(key),
        ValidateLifetime         = true
    };
});

builder.Services.AddAuthorization();

builder.Services.Configure<ExternalServicesOptions>(
    builder.Configuration.GetSection("ExternalServices"));

builder.Services.Configure<AutoServe.API.EmailOptions>(
    builder.Configuration.GetSection("Email"));

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IOrderService, OrderService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    SeedDefaultUsers(db);
}

// ── Middleware pipeline ────────────────────────────────────────────────
app.UseCors("AllowAll");                        // FIRST — always
app.UseMiddleware<GlobalExceptionMiddleware>();  // SECOND

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();

// ── Seed default users ─────────────────────────────────────────────────
static void SeedDefaultUsers(AppDbContext db)
{
    var defaults = new[]
    {
        new { FirstName = "Auto", LastName = "Admin",
              Email = "admin@autoserve.local",
              Phone = "9800000101", Password = "Admin@123",
              Role = "Admin" },
        new { FirstName = "Auto", LastName = "Staff",
              Email = "staff@autoserve.local",
              Phone = "9800000102", Password = "Staff@123",
              Role = "Staff" },
        new { FirstName = "Auto", LastName = "Customer",
              Email = "customer@autoserve.local",
              Phone = "9800000103", Password = "Customer@123",
              Role = "Customer" }
    };

    var changed = false;

    foreach (var user in defaults)
    {
        var email    = user.Email.ToLowerInvariant();
        var existing = db.Customers
            .FirstOrDefault(c => c.Email.ToLower() == email);
        var hash     = HashPassword(user.Password);

        if (existing == null)
        {
            db.Customers.Add(new Customer
            {
                FirstName    = user.FirstName,
                LastName     = user.LastName,
                Email        = email,
                Phone        = user.Phone,
                PasswordHash = hash,
                Role         = user.Role
            });
            changed = true;
            continue;
        }

        if (existing.PasswordHash != hash || existing.Role != user.Role)
        {
            existing.PasswordHash = hash;
            existing.Role         = user.Role;
            if (string.IsNullOrWhiteSpace(existing.Phone))
                existing.Phone = user.Phone;
            changed = true;
        }
    }

    if (changed)
        db.SaveChanges();

    SeedCustomerDemoData(db);
}

// ── Seed demo data ─────────────────────────────────────────────────────
static void SeedCustomerDemoData(AppDbContext db)
{
    var customerEmail = "customer@autoserve.local";
    var customer      = db.Customers
        .FirstOrDefault(c => c.Email.ToLower() == customerEmail);
    if (customer == null) return;

    // ── Vehicles ───────────────────────────────────────────────────────
    var hasVehicles = db.Vehicles.Any(v => v.CustomerId == customer.Id);
    if (!hasVehicles)
    {
        var v1 = new Vehicle
        {
            VehicleNumber     = "BA-77-PA-9901",
            VehicleMake       = "Toyota",
            VehicleModel      = "Corolla",
            ManufacturingYear = 2020,
            VehicleType       = "Sedan",
            Color             = "Pearl White",
            DateAdded         = DateTime.UtcNow.AddMonths(-18),
            CustomerId        = customer.Id
        };
        var v2 = new Vehicle
        {
            VehicleNumber     = "BA-22-KA-9902",
            VehicleMake       = "Honda",
            VehicleModel      = "CR-V",
            ManufacturingYear = 2018,
            VehicleType       = "SUV",
            Color             = "Meteor Grey",
            DateAdded         = DateTime.UtcNow.AddMonths(-30),
            CustomerId        = customer.Id
        };
        db.Vehicles.AddRange(v1, v2);
        db.SaveChanges();

        db.ServiceRecords.AddRange(
            new ServiceRecord
            {
                VehicleId   = v1.Id,
                ServiceDate = DateTime.UtcNow.AddMonths(-12),
                ServiceType = "Oil Change",
                Description = "Full synthetic oil change & filter",
                TotalCost   = 3200,
                Status      = "Completed"
            },
            new ServiceRecord
            {
                VehicleId   = v1.Id,
                ServiceDate = DateTime.UtcNow.AddMonths(-6),
                ServiceType = "Brake Inspection",
                Description = "Front brake pads replaced",
                TotalCost   = 7500,
                Status      = "Completed"
            },
            new ServiceRecord
            {
                VehicleId   = v1.Id,
                ServiceDate = DateTime.UtcNow.AddMonths(-1),
                ServiceType = "Tire Rotation",
                Description = "All four tires rotated & balanced",
                TotalCost   = 1800,
                Status      = "Completed"
            },
            new ServiceRecord
            {
                VehicleId   = v2.Id,
                ServiceDate = DateTime.UtcNow.AddMonths(-14),
                ServiceType = "Engine Tune-Up",
                Description = "Spark plugs, air & fuel filter replaced",
                TotalCost   = 9500,
                Status      = "Completed"
            },
            new ServiceRecord
            {
                VehicleId   = v2.Id,
                ServiceDate = DateTime.UtcNow.AddMonths(-7),
                ServiceType = "Full Service",
                Description = "Annual comprehensive service package",
                TotalCost   = 18000,
                Status      = "Completed"
            }
        );
        db.SaveChanges();
    }

    // ── Orders ─────────────────────────────────────────────────────────
    var hasOrders = db.Orders.Any(o => o.CustomerId == customer.Id);
    if (!hasOrders)
    {
        var products = db.Products.Take(10).ToList();
        if (products.Count >= 6)
        {
            var order1 = new Order
            {
                CustomerId     = customer.Id,
                OrderDate      = DateTime.UtcNow.AddMonths(-10),
                Status         = "Completed",
                TotalAmount    = 9700,
                DiscountAmount = 0
            };
            var order2 = new Order
            {
                CustomerId     = customer.Id,
                OrderDate      = DateTime.UtcNow.AddMonths(-4),
                Status         = "Completed",
                TotalAmount    = 14300,
                DiscountAmount = 1430
            };
            var order3 = new Order
            {
                CustomerId     = customer.Id,
                OrderDate      = DateTime.UtcNow.AddMonths(-1),
                Status         = "Pending",
                TotalAmount    = 6800,
                DiscountAmount = 0
            };
            db.Orders.AddRange(order1, order2, order3);
            db.SaveChanges();

            db.OrderItems.AddRange(
                new OrderItem
                {
                    OrderId   = order1.Id,
                    ProductId = products[0].Id,
                    Quantity  = 2,
                    UnitPrice = products[0].Price
                },
                new OrderItem
                {
                    OrderId   = order1.Id,
                    ProductId = products[2].Id,
                    Quantity  = 1,
                    UnitPrice = products[2].Price
                },
                new OrderItem
                {
                    OrderId   = order2.Id,
                    ProductId = products[3].Id,
                    Quantity  = 1,
                    UnitPrice = products[3].Price
                },
                new OrderItem
                {
                    OrderId   = order2.Id,
                    ProductId = products[4].Id,
                    Quantity  = 2,
                    UnitPrice = products[4].Price
                },
                new OrderItem
                {
                    OrderId   = order3.Id,
                    ProductId = products[1].Id,
                    Quantity  = 1,
                    UnitPrice = products[1].Price
                },
                new OrderItem
                {
                    OrderId   = order3.Id,
                    ProductId = products[5].Id,
                    Quantity  = 2,
                    UnitPrice = products[5].Price
                }
            );
            db.SaveChanges();
        }
    }

    // ── Appointments ───────────────────────────────────────────────────
    var hasAppointments = db.Appointments
        .Any(a => a.CustomerId == customer.Id);
    if (!hasAppointments)
    {
        var vehicle = db.Vehicles
            .FirstOrDefault(v => v.CustomerId == customer.Id);
        if (vehicle != null)
        {
            db.Appointments.AddRange(
                new Appointment
                {
                    CustomerId      = customer.Id,
                    VehicleId       = vehicle.Id,
                    AppointmentDate = DateTime.UtcNow.AddMonths(-8),
                    ServiceType     = "Oil Change",
                    Notes           = "Use full synthetic 5W-30",
                    Status          = "Completed",
                    CreatedAt       = DateTime.UtcNow.AddMonths(-8)
                },
                new Appointment
                {
                    CustomerId      = customer.Id,
                    VehicleId       = vehicle.Id,
                    AppointmentDate = DateTime.UtcNow.AddMonths(-2),
                    ServiceType     = "Brake Inspection",
                    Notes           = "Check rear brake pads too",
                    Status          = "Completed",
                    CreatedAt       = DateTime.UtcNow.AddMonths(-2)
                },
                new Appointment
                {
                    CustomerId      = customer.Id,
                    VehicleId       = vehicle.Id,
                    AppointmentDate = DateTime.UtcNow.AddDays(14),
                    ServiceType     = "Engine Tune-Up",
                    Notes           = "Full tune-up requested",
                    Status          = "Pending",
                    CreatedAt       = DateTime.UtcNow
                }
            );
            db.SaveChanges();
        }
    }

    // ── Part Requests ──────────────────────────────────────────────────
    var hasPartRequests = db.PartRequests
        .Any(pr => pr.CustomerId == customer.Id);
    if (!hasPartRequests)
    {
        var vehicle = db.Vehicles
            .FirstOrDefault(v => v.CustomerId == customer.Id);
        if (vehicle != null)
        {
            db.PartRequests.AddRange(
                new PartRequest
                {
                    CustomerId  = customer.Id,
                    VehicleId   = vehicle.Id,
                    PartName    = "Timing Belt Kit",
                    PartNumber  = "TB-2020-CRL",
                    Description = "OEM timing belt set for 2020 Corolla",
                    Status      = "Pending",
                    CreatedAt   = DateTime.UtcNow.AddDays(-30)
                },
                new PartRequest
                {
                    CustomerId  = customer.Id,
                    VehicleId   = vehicle.Id,
                    PartName    = "Clutch Plate Set",
                    PartNumber  = "CP-2020-CRL",
                    Description = "Complete clutch replacement kit",
                    Status      = "Approved",
                    CreatedAt   = DateTime.UtcNow.AddDays(-15)
                },
                new PartRequest
                {
                    CustomerId  = customer.Id,
                    VehicleId   = vehicle.Id,
                    PartName    = "Rear Shock Absorber",
                    PartNumber  = "SA-CRV-2018",
                    Description = "Both rear shocks for Honda CR-V 2018",
                    Status      = "Fulfilled",
                    CreatedAt   = DateTime.UtcNow.AddDays(-60)
                }
            );
            db.SaveChanges();
        }
    }

    // ── Reviews ────────────────────────────────────────────────────────
    var hasReviews = db.Reviews
        .Any(r => r.CustomerId == customer.Id);
    if (!hasReviews)
    {
        db.Reviews.AddRange(
            new Review
            {
                CustomerId = customer.Id,
                Rating     = 5,
                Comment    = "Excellent service! Very professional staff.",
                CreatedAt  = DateTime.UtcNow.AddMonths(-6)
            },
            new Review
            {
                CustomerId = customer.Id,
                Rating     = 4,
                Comment    = "Good service, parts were delivered on time.",
                CreatedAt  = DateTime.UtcNow.AddMonths(-2)
            }
        );
        db.SaveChanges();
    }
}

// ── Password hash helper ───────────────────────────────────────────────
static string HashPassword(string password)
{
    using var sha = SHA256.Create();
    return Convert.ToBase64String(
        sha.ComputeHash(Encoding.UTF8.GetBytes(password)));
}