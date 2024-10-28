import type { Moment } from "moment";
import { ItemView, WorkspaceLeaf } from "obsidian";
import { mount, unmount } from "svelte";
import { get, type Writable } from "svelte/store";

import { dateRangeContextKey, viewTypeWeekly } from "../constants";
import type { DayPlannerSettings } from "../settings";
import type { ComponentContext, DateRange } from "../types";
import * as r from "../util/range";

import HeaderActions from "./components/multi-day/header-actions.svelte";
import MultiDayGrid from "./components/multi-day/multi-day-grid.svelte";
import { useDateRanges } from "./hooks/use-date-ranges";

export default class MultiDayView extends ItemView {
  private static readonly defaultDisplayText = "Multi-Day View";
  navigation = false;
  private multiDayComponent?: typeof MultiDayGrid;
  private headerActionsComponent?: HeaderActions;
  private dateRange?: DateRange;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly settings: Writable<DayPlannerSettings>,
    private readonly componentContext: ComponentContext,
    private readonly dateRanges: ReturnType<typeof useDateRanges>,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return viewTypeWeekly;
  }

  getDisplayText(): string {
    if (!this.dateRange) {
      return MultiDayView.defaultDisplayText;
    }

    const currentDateRange = get(this.dateRange);

    if (!currentDateRange) {
      return MultiDayView.defaultDisplayText;
    }

    return r.toString(get(this.dateRange));
  }

  getIcon() {
    return "table-2";
  }

  async onOpen() {
    const headerEl = this.containerEl.children[0];
    const contentEl = this.containerEl.children[1];
    const currentSettings = get(this.settings);

    this.dateRange = this.dateRanges.trackRange(
      r.createRange(
        currentSettings.multiDayRange,
        currentSettings.firstDayOfWeek,
      ),
    );

    this.register(this.dateRange.subscribe(this.updateTabTitleAndHeader));

    // todo: remove manual state synchronization
    // todo: test if this causes week reset
    this.register(
      this.settings.subscribe((next) => {
        this.dateRange?.set(
          r.createRange(next.multiDayRange, next.firstDayOfWeek),
        );
      }),
    );

    const context = new Map([
      ...this.componentContext,
      [dateRangeContextKey, this.dateRange],
    ]);

    // @ts-expect-error
    this.weekComponent = mount(MultiDayGrid, {
      target: contentEl,
      context,
    });

    const viewActionsEl = headerEl.querySelector(".view-actions");

    if (viewActionsEl) {
      const customActionsEl = createDiv();

      viewActionsEl.prepend(customActionsEl);
      // @ts-expect-error
      this.headerActionsComponent = mount(HeaderActions, {
        target: customActionsEl,
        context,
      });
    }
  }

  async onClose() {
    this.dateRange?.untrack();

    if (this.multiDayComponent) {
      unmount(this.multiDayComponent);
    }

    if (this.headerActionsComponent) {
      unmount(this.headerActionsComponent);
    }
  }

  private updateTabTitleAndHeader = (range: Moment[]) => {
    const newText = r.toString(range);

    // @ts-expect-error: undocumented API
    this.titleEl?.setText(newText);
    // @ts-expect-error: undocumented API
    this.leaf.updateHeader?.();
  };
}
