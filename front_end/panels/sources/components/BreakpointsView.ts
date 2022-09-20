// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import breakpointsViewStyles from './breakpointsView.css.js';

const UIStrings = {
  /**
  *@description Text exposed to screen readers on checked items.
  */
  checked: 'checked',
  /**
  *@description Accessible text exposed to screen readers when the screen reader encounters an unchecked checkbox.
  */
  unchecked: 'unchecked',
  /**
  *@description Accessible text for a breakpoint collection with a combination of checked states.
  */
  indeterminate: 'mixed',
  /**
  *@description Accessibility label for hit breakpoints in the Sources panel.
  *@example {checked} PH1
  */
  breakpointHit: '{PH1} breakpoint hit',
  /**
  *@description Tooltip text that shows when hovered over a remove button that appears next to a filename in the breakpoint sidebarof the sources panel.
  */
  removeBreakpointsInFile: 'Remove all breakpoints in file',
  /**
  *@description Tooltip text that shows when hovered over a remove button that appears next to a breakpoint in the breakpoint sidebar of the sources panel.
  */
  removeBreakpoint: 'Remove breakpoint',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/components/BreakpointsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const MAX_SNIPPET_LENGTH = 200;

export interface BreakpointsViewData {
  groups: BreakpointGroup[];
}

export interface BreakpointGroup {
  name: string;
  url: Platform.DevToolsPath.UrlString;
  expanded: boolean;
  breakpointItems: BreakpointItem[];
}

export interface BreakpointItem {
  location: string;
  codeSnippet: string;
  isHit: boolean;
  status: BreakpointStatus;
  hoverText?: string;
}

export const enum BreakpointStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
  INDETERMINATE = 'INDETERMINATE',
}

export class CheckboxToggledEvent extends Event {
  static readonly eventName = 'checkboxtoggled';
  data: {breakpointItem: BreakpointItem, checked: boolean};

  constructor(breakpointItem: BreakpointItem, checked: boolean) {
    super(CheckboxToggledEvent.eventName);
    this.data = {breakpointItem: breakpointItem, checked};
  }
}

export class ExpandedStateChangedEvent extends Event {
  static readonly eventName = 'expandedstatechanged';
  data: {url: Platform.DevToolsPath.UrlString, expanded: boolean};

  constructor(url: Platform.DevToolsPath.UrlString, expanded: boolean) {
    super(ExpandedStateChangedEvent.eventName);
    this.data = {url, expanded};
  }
}

export class BreakpointSelectedEvent extends Event {
  static readonly eventName = 'breakpointselected';
  data: {breakpointItem: BreakpointItem};

  constructor(breakpointItem: BreakpointItem) {
    super(BreakpointSelectedEvent.eventName);
    this.data = {breakpointItem: breakpointItem};
  }
}

export class BreakpointsRemovedEvent extends Event {
  static readonly eventName = 'breakpointsremoved';
  data: {breakpointItems: BreakpointItem[]};

  constructor(breakpointItems: BreakpointItem[]) {
    super(BreakpointsRemovedEvent.eventName);
    this.data = {breakpointItems};
  }
}

export class BreakpointsView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-breakpoint-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);

  #breakpointGroups: BreakpointGroup[] = [];
  #hoveredElement?: BreakpointGroup|BreakpointItem;

  set data(data: BreakpointsViewData) {
    this.#breakpointGroups = data.groups;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [breakpointsViewStyles];
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #render(): void {
    const renderedGroups = this.#breakpointGroups.map((group, index) => {
      const out = this.#renderBreakpointGroup(group);
      if (index === this.#breakpointGroups.length - 1) {
        return out;
      }
      return LitHtml.html`${out}<div class='divider'></div>`;
    });
    LitHtml.render(LitHtml.html`${renderedGroups}`, this.#shadow, {host: this});
  }

  renderRemoveBreakpointButton(clickHandler: () => void, tooltipText: string): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
    <button class='remove-breakpoint-button' @click=${clickHandler} title=${tooltipText}>
    <${IconButton.Icon.Icon.litTagName} .data=${{
        iconName: 'close-icon',
        width: '7px',
        color: 'var(--color-text-secondary)',
      } as IconButton.Icon.IconData}
      }>
      </${IconButton.Icon.Icon.litTagName}>
    </button>
      `;
    // clang-format on
  }

  #renderBreakpointGroup(group: BreakpointGroup): LitHtml.TemplateResult {
    let removeFileBreakpointsButton: LitHtml.TemplateResult|symbol = LitHtml.nothing;
    if (group === this.#hoveredElement) {
      const clickHandler = (): void => {
        this.dispatchEvent(new BreakpointsRemovedEvent(group.breakpointItems));
      };
      removeFileBreakpointsButton =
          this.renderRemoveBreakpointButton(clickHandler, i18nString(UIStrings.removeBreakpointsInFile));
    }

    // clang-format off
    return LitHtml.html`
      <details data-group='true' ?open=${group.expanded} @click=${(e: Event): void => this.#onGroupExpandToggled(e, group)}>
        <summary @mouseover=${():void => this.#onMouseOver(group)} @mouseout=${():void => this.#onMouseOut(group)}>
          <span class='group-header'>${this.#renderFileIcon()}<span class='group-header-title'>${group.name}</span></span><span class='group-hover-actions'>${removeFileBreakpointsButton}</span>
        </summary>
        ${LitHtml.html`
          ${group.breakpointItems.map(entry => this.#renderBreakpointEntry(entry))}`}
      </div>
      `;
    // clang-format on
  }

  #renderFileIcon(): LitHtml.TemplateResult {
    return LitHtml.html`
      <${IconButton.Icon.Icon.litTagName} .data=${
        {iconName: 'ic_file_script', color: 'var(--color-ic-file-script)', width: '16px', height: '16px'} as
        IconButton.Icon.IconWithName}></${IconButton.Icon.Icon.litTagName}>
    `;
  }

  #renderBreakpointEntry(breakpointItem: BreakpointItem): LitHtml.TemplateResult {
    const isHovered = breakpointItem === this.#hoveredElement;
    let deleteButton: LitHtml.TemplateResult|symbol = LitHtml.nothing;
    if (isHovered) {
      const clickHandler = (): void => {
        this.dispatchEvent(new BreakpointsRemovedEvent([breakpointItem]));
      };
      deleteButton = this.renderRemoveBreakpointButton(clickHandler, i18nString(UIStrings.removeBreakpoint));
    }

    const classMap = {
      'breakpoint-item': true,
      'hit': breakpointItem.isHit,
    };
    const breakpointItemDescription = this.#getBreakpointItemDescription(breakpointItem);
    const codeSnippet = Platform.StringUtilities.trimEndWithMaxLength(breakpointItem.codeSnippet, MAX_SNIPPET_LENGTH);

    // clang-format off
    return LitHtml.html`
    <div class=${LitHtml.Directives.classMap(classMap)} aria-label=${breakpointItemDescription}  tabIndex=${breakpointItem.isHit ? 0 : -1} @mouseover=${():void => this.#onMouseOver(breakpointItem)} @mouseout=${():void => this.#onMouseOut(breakpointItem)}>
      <label class='checkbox-label'>
        <input type='checkbox' aria-label=${breakpointItem.location} ?indeterminate=${breakpointItem.status === BreakpointStatus.INDETERMINATE} ?checked=${breakpointItem.status === BreakpointStatus.ENABLED} @change=${(e: Event): void => this.#onCheckboxToggled(e, breakpointItem)}>
      </label>
      <span class='code-snippet' @click=${():void => {this.dispatchEvent(new BreakpointSelectedEvent(breakpointItem));}}>${codeSnippet}</span>
      <span class='breakpoint-item-location-or-actions'>
        ${isHovered ? LitHtml.html`${deleteButton}`: LitHtml.html`<span class='location'>${breakpointItem.location}</span>`}
      </span>
    </div>
    `;
    // clang-format on
  }

  #onMouseOver(element: BreakpointGroup|BreakpointItem): void {
    if (this.#hoveredElement === element) {
      return;
    }
    this.#hoveredElement = element;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #onMouseOut(element: BreakpointGroup|BreakpointItem): void {
    if (this.#hoveredElement !== element) {
      return;
    }
    this.#hoveredElement = undefined;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #getBreakpointItemDescription(breakpointItem: BreakpointItem): Platform.UIString.LocalizedString {
    let checkboxDescription;
    switch (breakpointItem.status) {
      case BreakpointStatus.ENABLED:
        checkboxDescription = i18nString(UIStrings.checked);
        break;
      case BreakpointStatus.DISABLED:
        checkboxDescription = i18nString(UIStrings.unchecked);
        break;
      case BreakpointStatus.INDETERMINATE:
        checkboxDescription = i18nString(UIStrings.indeterminate);
        break;
    }
    if (!breakpointItem.isHit) {
      return checkboxDescription;
    }
    return i18nString(UIStrings.breakpointHit, {PH1: checkboxDescription});
  }

  #onGroupExpandToggled(e: Event, group: BreakpointGroup): void {
    const detailsElement = e.target as HTMLDetailsElement;
    group.expanded = detailsElement.open;
    this.dispatchEvent(new ExpandedStateChangedEvent(group.url, detailsElement.open));
  }

  #onCheckboxToggled(e: Event, item: BreakpointItem): void {
    const element = e.target as HTMLInputElement;
    this.dispatchEvent(new CheckboxToggledEvent(item, element.checked));
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-breakpoint-view', BreakpointsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-breakpoint-view': BreakpointsView;
  }
}
