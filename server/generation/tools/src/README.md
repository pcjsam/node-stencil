# CodeGenerator

A modernized .NET 8 code generation tool migrated from legacy .NET Framework 4.8 codebase.

## Vibe Coded from legacy code 100% by Cursor and William Mansfield

This project represents a complete modernization and restructuring of an original .NET Framework 4.8 code generator into a modern .NET 8 solution with improved architecture, cross-platform compatibility, and enhanced functionality.

## Project Overview

The CodeGenerator is a tool that processes XML data files through XSL templates to generate code files. It supports both command-line and graphical user interfaces, with features for file generation, path handling, and template management.

## Solution Structure

```
server/generation/tools/
├── code-generator-cli.exe       # AI entrypoint (built, not in git)
├── code-generator.exe           # Human GUI, Windows only (built, not in git)
├── code-generator.config.xml    # XML source, templates, output folder
└── src/                         # C# source + build scripts (curious engineers)
    ├── build.ps1 / build.sh
    ├── generate.ps1 / generate.sh
    ├── CodeGenerator.Cli/
    ├── CodeGenerator.Gui/
    └── CodeGenerator.Core/
```

## Build and Deployment

You do not need to know C#. From the repo:

```powershell
.\server\generation\tools\src\build.ps1    # Windows
```

```bash
./server/generation/tools/src/build.sh     # macOS / Linux
```

That copies binaries into `server/generation/tools/` next to the config:

- **CLI** (all platforms) — `code-generator-cli.exe` or `code-generator-cli`. This is what AI uses.
- **GUI** (Windows only) — `code-generator.exe`. WinForms; skipped on macOS/Linux.

Self-contained single-file builds include the .NET runtime so engineers only need the SDK for the one-time compile. `build_contained.ps1` / `.bat` wrap the same script.

### Prerequisites
- .NET 8 SDK or newer (https://dotnet.microsoft.com/download/dotnet/8.0)

## Output

Build scripts always write to `server/generation/tools/` regardless of your current directory.

## Projects

### CodeGenerator.Core
- **Type**: Class Library (.NET 8)
- **Purpose**: Contains the core translation logic, XML processing, and file generation capabilities
- **Key Components**:
  - `Translator`: Main translation engine
  - `Template`: Template management
  - `Options`: Configuration settings
  - `Utility`: Helper methods

### CodeGenerator.Cli
- **Type**: Console Application (.NET 8)
- **Purpose**: Command-line interface for code generation
- **Usage**:
  ```bash
  # Using config file
  code-generator-cli.exe data.xml
  
  # Using explicit arguments
  code-generator-cli.exe data.xml output-folder template1.xsl template2.xsl
  ```

### CodeGenerator.Gui
- **Type**: Windows Forms Application (.NET 8)
- **Purpose**: Graphical user interface for code generation
- **Features**:
  - File browser dialogs
  - Template selection
  - Progress tracking
  - Configuration persistence

## Key Features

### How one template becomes many files

XSL output is one stream. Markers in that stream tell the CLI where each file starts and whether to overwrite. The CLI **removes the markers** before writing. They never appear in `server/api`.

People working on the API should not be taught these names. Describe the log instead: **Created/Updated** (rewritten every run) or **Skipping existing file** (created once, then left alone).

Use the markers only when editing a template:

- **STARTFILE** … **ENDFILE**: write this path every run (overwrite).
- **ENSUREFILE** … **ENDFILE**: write this path only if it does not exist yet.

### Path Handling
- Supports relative and absolute paths
- Automatic directory creation
- Cross-platform path normalization
- Config file relative path resolution

### Configuration
- XML-based configuration file (`code-generator.config.xml`)
- Persistent settings between sessions
- Template selection state
- Output folder preferences

## Migration Notes

### From .NET Framework 4.8 to .NET 8
- Replaced `XslTransform` with `XslCompiledTransform`
- Updated `HttpUtility.HtmlDecode` to `System.Net.WebUtility.HtmlDecode`
- Enhanced XML conformance handling
- Improved path resolution and cross-platform compatibility

### Architecture Improvements
- Separated concerns into distinct projects
- Enhanced error handling and logging
- Improved configuration management
- Better separation of CLI and GUI interfaces

## Configuration File Format

```xml
<?xml version="1.0" encoding="utf-8"?>
<Options>
  <DataFile>path/to/data.xml</DataFile>
  <OutputFolder>path/to/output</OutputFolder>
  <SelectedFiles>
    <string>template1.xsl</string>
    <string>template2.xsl</string>
  </SelectedFiles>
  <UnSelectedFiles>
    <string>template3.xsl</string>
  </UnSelectedFiles>
</Options>
```

## Usage Examples

### GUI
1. Launch `code-generator.exe`
2. Browse for XML data file
3. Load and select XSL templates
4. Set output folder
5. Click "Generate Files"

### CLI with Config
```bash
code-generator-cli.exe data.xml
```

### CLI with Explicit Arguments
```bash
code-generator-cli.exe data.xml output/ template1.xsl template2.xsl
```

## Sample XML and XSL

### Sample XML Data File (`sample-data.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<items projectName="SampleProject" frontendPrefix="src/" backendPrefix="api/">
  <item name="User" classOnly="true">
    <field type="string" isNullable="false" friendlyName="Name">name</field>
    <field type="string" isNullable="false" friendlyName="Email">email</field>
    <field type="int" isNullable="false" friendlyName="Age">age</field>
  </item>
</items>
```

### Sample XSL Template (`sample-template.xsl`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template match="/">
    <xsl:for-each select="//item">
      <xsl:variable name="className" select="@name"/>
      
      '''[STARTFILE:<xsl:value-of select="../@frontendPrefix"/><xsl:value-of select="$className"/>.ts]
      export class <xsl:value-of select="$className"/> {
        <xsl:for-each select="field">
          <xsl:value-of select="@friendlyName"/>: <xsl:value-of select="@type"/>;
        </xsl:for-each>
      }
      '''[ENDFILE]
      
    </xsl:for-each>
  </xsl:template>
</xsl:stylesheet>
```

### Generated Output (`src/User.ts`)
```typescript
export class User {
  Name: string;
  Email: string;
  Age: int;
}
```

This example demonstrates:
- XML data with project configuration (`frontendPrefix`)
- XSL template that processes each `item` element
- STARTFILE token with dynamic path construction
- Generated TypeScript class with properties from XML fields

## Development Notes

- All code files include the header: "Vibe Coded from legacy code 100% by Cursor and William Mansfield"
- Version information is centralized in `version.props`
- Build scripts produce single-file executables for easy distribution
- Debug output can be enabled for troubleshooting

## License

This project is a modernization of legacy code. Please refer to the original project's license terms. 