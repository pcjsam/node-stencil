<?xml version="1.0" encoding="UTF-8" ?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<!--
  DependencyCoordinator — STARTFILE/ENDFILE.
  Emits typed on{Child}Changed methods for items that declare iInvalidateForeignKey
  on a foreign-key field (child write → mark parent dirty). No product-specific
  entity names; driven entirely by XML attributes.
-->
<xsl:template match="/">

'''[STARTFILE:<xsl:value-of select="items/@backendPrefix"/>entities\dependencies\dependency-coordinator.ts]
import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EntityRegistry } from '../entity.registry';
<xsl:for-each select="items/item[not(@classOnly='true') and count(field[string-length(@iInvalidateForeignKey)>0])>0]">
   <xsl:variable name="name_lowered"><xsl:call-template name="ToLower"><xsl:with-param name="inputString" select="@name"/></xsl:call-template></xsl:variable>
import { <xsl:value-of select="@name"/> } from '../<xsl:value-of select="$name_lowered"/>/<xsl:value-of select="$name_lowered"/>.model';
</xsl:for-each>

/**
 * Cascades iInvalidateForeignKey: when a child mutates, mark the FK parent dirty
 * (calculation_utc = null). Never throws to the writer — prefer stale/dirty parent
 * over failing the child's insert/replace/delete.
 *
 * Generated from stencil XML. Do not hand-edit.
 */
@Injectable()
export class DependencyCoordinator {
   private readonly logger = new Logger(DependencyCoordinator.name);
   private _entities?: EntityRegistry;

   constructor(private readonly moduleRef: ModuleRef) {}

   private get entities(): EntityRegistry {
      if (!this._entities) {
         this._entities = this.moduleRef.get(EntityRegistry, { strict: false });
      }
      return this._entities!;
   }

   private async safe(label: string, fn: () =&gt; Promise&lt;void&gt;): Promise&lt;void&gt; {
      try {
         await fn();
      } catch (err) {
         this.logger.warn(`iInvalidateForeignKey failed (${label}); parent left dirty/stale`, err as Error);
      }
   }

<xsl:for-each select="items/item[not(@classOnly='true') and count(field[string-length(@iInvalidateForeignKey)>0])>0]">
   <xsl:variable name="child_name" select="@name"/>
   <xsl:variable name="child_camel"><xsl:call-template name="Camel"><xsl:with-param name="inputString" select="@name"/></xsl:call-template></xsl:variable>
   async on<xsl:value-of select="$child_name"/>Changed(document: <xsl:value-of select="$child_name"/>): Promise&lt;void&gt; {
      <xsl:for-each select="field[string-length(@iInvalidateForeignKey)>0 and string-length(@foreignKey)>0]">
      <xsl:variable name="fk_entity" select="@foreignKey"/>
      <xsl:variable name="fk_field" select="text()"/>
      <xsl:variable name="fk_camel"><xsl:call-template name="Camel"><xsl:with-param name="inputString" select="@foreignKey"/></xsl:call-template></xsl:variable>
      <xsl:variable name="parent" select="/items/item[@name=$fk_entity]"/>
      <xsl:choose>
      <xsl:when test="@isNullable='true'">
      if (document.<xsl:value-of select="$fk_field"/>) {
         await this.safe('<xsl:value-of select="$child_name"/>-&gt;<xsl:value-of select="$fk_entity"/>', () =&gt;
            this.entities.<xsl:value-of select="$fk_camel"/>Manager.invalidate(<xsl:if test="not(@detachedForeign='true')"><xsl:for-each select="$parent/field[@tenant='true']">document.<xsl:value-of select="text()"/>, </xsl:for-each></xsl:if>document.<xsl:value-of select="$fk_field"/>, '<xsl:value-of select="$child_name"/> changed')
         );
      }
      </xsl:when>
      <xsl:otherwise>
      await this.safe('<xsl:value-of select="$child_name"/>-&gt;<xsl:value-of select="$fk_entity"/>', () =&gt;
         this.entities.<xsl:value-of select="$fk_camel"/>Manager.invalidate(<xsl:if test="not(@detachedForeign='true')"><xsl:for-each select="$parent/field[@tenant='true']">document.<xsl:value-of select="text()"/>, </xsl:for-each></xsl:if>document.<xsl:value-of select="$fk_field"/>, '<xsl:value-of select="$child_name"/> changed')
      );
      </xsl:otherwise>
      </xsl:choose>
      </xsl:for-each>
   }

</xsl:for-each>}

'''[ENDFILE]

</xsl:template>

<xsl:template name="ToLower">
   <xsl:param name="inputString"/>
   <xsl:variable name="smallCase" select="'abcdefghijklmnopqrstuvwxyz'"/>
   <xsl:variable name="upperCase" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'"/>
   <xsl:value-of select="translate($inputString,$upperCase,$smallCase)"/>
</xsl:template>
<xsl:template name="Camel">
   <xsl:param name="inputString"/>
   <xsl:choose>
      <xsl:when test="string-length($inputString) = 0"></xsl:when>
      <xsl:otherwise>
      <xsl:variable name="lowered"><xsl:call-template name="ToLower"><xsl:with-param name="inputString" select="$inputString"/></xsl:call-template></xsl:variable>
      <xsl:value-of select="concat(substring($lowered, 1, 1), substring($inputString, 2))"/>
      </xsl:otherwise>
   </xsl:choose>
</xsl:template>
</xsl:stylesheet>
