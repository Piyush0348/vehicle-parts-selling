using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/info")]
public class InfoController : ControllerBase
{
    [HttpGet("about")]
    public IActionResult About()
    {
        return Ok(new
        {
            Service = "Auto Parts System",
            Location = "Nepal",
            Contact = "9800000000"
        });
    }

    [HttpGet("home")]
    public IActionResult Home()
    {
        return Ok("Welcome to Auto Parts System");
    }
}
