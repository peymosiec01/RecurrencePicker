import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from 'react-dom';
import { RecurrencePickerComponent, IRecurrenceData } from "./RecurrencePickerComponent";

export class RecurrencePicker implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _context: ComponentFramework.Context<IInputs>;
    private _notifyOutputChanged: () => void;
    private _recurrenceData: IRecurrenceData | null = null;
    private _isVisible = false;

    constructor() {
        // Constructor
    }

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this._context = context;
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;
        this._isVisible = context.parameters.isVisible?.raw ?? false;

        // Parse initial recurrence data if available
        if (context.parameters.recurrenceData?.raw) {
            try {
                this._recurrenceData = JSON.parse(context.parameters.recurrenceData.raw);
            } catch (error) {
                console.error("Error parsing recurrence data:", error);
                this._recurrenceData = null;
            }
        }

        this.renderComponent();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        
        // Update visibility
        const newVisibility = context.parameters.isVisible?.raw ?? false;
        if (newVisibility !== this._isVisible) {
            this._isVisible = newVisibility;
        }

        // Update recurrence data if changed
        if (context.parameters.recurrenceData?.raw) {
            try {
                const newData = JSON.parse(context.parameters.recurrenceData.raw);
                if (JSON.stringify(newData) !== JSON.stringify(this._recurrenceData)) {
                    this._recurrenceData = newData;
                }
            } catch (error) {
                console.error("Error parsing recurrence data:", error);
            }
        }

        this.renderComponent();
    }

    public getOutputs(): IOutputs {
        return {
            recurrenceData: this._recurrenceData ? JSON.stringify(this._recurrenceData) : "",
            isVisible: this._isVisible,
            recurrenceDescription: this._recurrenceData?.description || ""
        };
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this._container);
    }

    private renderComponent(): void {
        const props = {
            isVisible: this._isVisible,
            initialData: this._recurrenceData,
            onSet: this.handleSetRecurrence.bind(this),
            onCancel: this.handleCancel.bind(this),
            onToggleVisibility: this.handleToggleVisibility.bind(this)
        };

        ReactDOM.render(
            React.createElement(RecurrencePickerComponent, props),
            this._container
        );
    }

    private handleSetRecurrence(data: IRecurrenceData): void {
        this._recurrenceData = data;
        this._isVisible = false;
        this._notifyOutputChanged();
    }

    private handleCancel(): void {
        this._isVisible = false;
        this._notifyOutputChanged();
    }

    private handleToggleVisibility(): void {
        this._isVisible = !this._isVisible;
        this._notifyOutputChanged();
    }
}