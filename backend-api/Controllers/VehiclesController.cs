using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

namespace AutoServe.API.Controllers;

[ApiController]
[Route("api/vehicles")]
public class VehiclesController : ControllerBase
{
    private readonly AppDbContext _context;

    public VehiclesController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var vehicles = await _context.Vehicles
            .AsNoTracking()
            .Select(v => new VehicleDto
            {
                Id = v.Id,
                VehicleNumber = v.VehicleNumber,
                VehicleMake = v.VehicleMake,
                VehicleModel = v.VehicleModel,
                ManufacturingYear = v.ManufacturingYear,
                VehicleType = v.VehicleType,
                Color = v.Color,
                CustomerId = v.CustomerId
            })
            .ToListAsync();

        return Ok(vehicles);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null) return NotFound(new { message = "Vehicle not found." });
        return Ok(MapToDto(vehicle));
    }

    [HttpGet("customer/{customerId:int}")]
    public async Task<IActionResult> GetByCustomer(int customerId)
    {
        var exists = await _context.Customers.AnyAsync(c => c.Id == customerId);
        if (!exists) return NotFound(new { message = "Customer not found." });

        var vehicles = await _context.Vehicles
            .Where(v => v.CustomerId == customerId)
            .AsNoTracking()
            .Select(v => new VehicleDto
            {
                Id = v.Id,
                VehicleNumber = v.VehicleNumber,
                VehicleMake = v.VehicleMake,
                VehicleModel = v.VehicleModel,
                ManufacturingYear = v.ManufacturingYear,
                VehicleType = v.VehicleType,
                Color = v.Color,
                CustomerId = v.CustomerId
            })
            .ToListAsync();

        return Ok(vehicles);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateVehicleDto dto)
    {
        var customerExists = await _context.Customers.AnyAsync(c => c.Id == dto.CustomerId);
        if (!customerExists)
            return BadRequest(new { message = $"Customer with ID {dto.CustomerId} does not exist." });

        var vehicle = new Vehicle
        {
            VehicleNumber = dto.VehicleNumber,
            VehicleMake = dto.VehicleMake,
            VehicleModel = dto.VehicleModel,
            ManufacturingYear = dto.ManufacturingYear,
            VehicleType = dto.VehicleType,
            Color = dto.Color,
            CustomerId = dto.CustomerId
        };

        _context.Vehicles.Add(vehicle);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id }, MapToDto(vehicle));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateVehicleDto dto)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null) return NotFound(new { message = "Vehicle not found." });

        vehicle.VehicleNumber = dto.VehicleNumber;
        vehicle.VehicleMake = dto.VehicleMake;
        vehicle.VehicleModel = dto.VehicleModel;
        vehicle.ManufacturingYear = dto.ManufacturingYear;
        vehicle.VehicleType = dto.VehicleType;
        vehicle.Color = dto.Color;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var vehicle = await _context.Vehicles.FindAsync(id);
        if (vehicle == null) return NotFound(new { message = "Vehicle not found." });

        _context.Vehicles.Remove(vehicle);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    private static VehicleDto MapToDto(Vehicle v) => new()
    {
        Id = v.Id,
        VehicleNumber = v.VehicleNumber,
        VehicleMake = v.VehicleMake,
        VehicleModel = v.VehicleModel,
        ManufacturingYear = v.ManufacturingYear,
        VehicleType = v.VehicleType,
        Color = v.Color,
        CustomerId = v.CustomerId
    };
}
