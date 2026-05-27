using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AutoServe.API.DTOs;

namespace AutoServe.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AppointmentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public AppointmentsController(AppDbContext context) => _context = context;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var appointments = await _context.Appointments
            .Include(a => a.Customer)
            .Include(a => a.Vehicle)
            .OrderByDescending(a => a.AppointmentDate)
            .AsNoTracking()
            .Select(a => new AppointmentDto
            {
                Id = a.Id,
                AppointmentDate = a.AppointmentDate,
                ServiceType = a.ServiceType,
                Notes = a.Notes,
                Status = a.Status,
                CreatedAt = a.CreatedAt,
                CustomerId = a.CustomerId,
                CustomerName = a.Customer.FirstName + " " + a.Customer.LastName,
                VehicleId = a.VehicleId,
                VehicleNumber = a.Vehicle.VehicleNumber
            })
            .ToListAsync();

        return Ok(appointments);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Customer)
            .Include(a => a.Vehicle)
            .AsNoTracking()
            .Where(a => a.Id == id)
            .Select(a => new AppointmentDto
            {
                Id = a.Id,
                AppointmentDate = a.AppointmentDate,
                ServiceType = a.ServiceType,
                Notes = a.Notes,
                Status = a.Status,
                CreatedAt = a.CreatedAt,
                CustomerId = a.CustomerId,
                CustomerName = a.Customer.FirstName + " " + a.Customer.LastName,
                VehicleId = a.VehicleId,
                VehicleNumber = a.Vehicle.VehicleNumber
            })
            .FirstOrDefaultAsync();

        if (appointment == null)
            return NotFound(new { message = $"Appointment with ID {id} was not found." });

        return Ok(appointment);
    }

    [HttpGet("customer/{customerId:int}")]
    public async Task<IActionResult> GetByCustomer(int customerId)
    {
        var exists = await _context.Customers.AnyAsync(c => c.Id == customerId);
        if (!exists)
            return NotFound(new { message = $"Customer with ID {customerId} was not found." });

        var appointments = await _context.Appointments
            .Where(a => a.CustomerId == customerId)
            .Include(a => a.Vehicle)
            .OrderByDescending(a => a.AppointmentDate)
            .AsNoTracking()
            .Select(a => new AppointmentDto
            {
                Id = a.Id,
                AppointmentDate = a.AppointmentDate,
                ServiceType = a.ServiceType,
                Notes = a.Notes,
                Status = a.Status,
                CreatedAt = a.CreatedAt,
                CustomerId = a.CustomerId,
                CustomerName = "",
                VehicleId = a.VehicleId,
                VehicleNumber = a.Vehicle.VehicleNumber
            })
            .ToListAsync();

        return Ok(appointments);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAppointmentDto dto)
    {
        var customer = await _context.Customers.FindAsync(dto.CustomerId);
        if (customer == null)
            return BadRequest(new { message = "Customer not found." });

        var vehicle = await _context.Vehicles.FindAsync(dto.VehicleId);
        if (vehicle == null)
            return BadRequest(new { message = "Vehicle not found." });

        if (vehicle.CustomerId != dto.CustomerId)
            return BadRequest(new { message = "Vehicle does not belong to the specified customer." });

        var appointment = new Appointment
        {
            AppointmentDate = dto.AppointmentDate,
            ServiceType = dto.ServiceType,
            Notes = dto.Notes,
            CustomerId = dto.CustomerId,
            VehicleId = dto.VehicleId
        };

        _context.Appointments.Add(appointment);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = appointment.Id }, new AppointmentDto
        {
            Id = appointment.Id,
            AppointmentDate = appointment.AppointmentDate,
            ServiceType = appointment.ServiceType,
            Notes = appointment.Notes,
            Status = appointment.Status,
            CreatedAt = appointment.CreatedAt,
            CustomerId = appointment.CustomerId,
            CustomerName = customer.FirstName + " " + customer.LastName,
            VehicleId = appointment.VehicleId,
            VehicleNumber = vehicle.VehicleNumber
        });
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateAppointmentDto dto)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
            return NotFound(new { message = $"Appointment with ID {id} was not found." });

        appointment.AppointmentDate = dto.AppointmentDate;
        appointment.ServiceType = dto.ServiceType;
        appointment.Notes = dto.Notes;
        appointment.Status = dto.Status;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var appointment = await _context.Appointments.FindAsync(id);
        if (appointment == null)
            return NotFound(new { message = $"Appointment with ID {id} was not found." });

        _context.Appointments.Remove(appointment);
        await _context.SaveChangesAsync();
        return NoContent();
    }
}