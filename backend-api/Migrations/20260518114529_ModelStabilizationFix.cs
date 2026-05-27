using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AutoServe.API.Migrations
{
    /// <inheritdoc />
    public partial class ModelStabilizationFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactPerson",
                table: "Suppliers",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactPerson",
                table: "Suppliers");
        }
    }
}
