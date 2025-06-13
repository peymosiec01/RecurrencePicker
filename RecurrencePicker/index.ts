import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import * as ReactDOM from 'react-dom';
import { RecurrencePickerComponent, IRecurrenceData } from "./RecurrencePickerComponent";
import { createDateUtils, setDateUtils } from "./DateUtils";


export class RecurrencePicker implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private _container: HTMLDivElement;
    private _context: ComponentFramework.Context<IInputs>;
    private _notifyOutputChanged: () => void;
    private _recurrenceData: IRecurrenceData | null = null;
    private _isVisible = false;
    private _dateLocale = "en-GB"; // default to en-GB

    constructor() {
        // Constructor
    }

    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
        this._context = context;
        this._container = container;
        this._notifyOutputChanged = notifyOutputChanged;
        this._isVisible = context.parameters.isVisible?.raw ?? false;
        this._dateLocale = context.parameters.dateLocale?.raw; // default to en-GB

        const utils = createDateUtils(this._dateLocale);
        setDateUtils(utils);

        this.renderComponent();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this._context = context;
        this._dateLocale = context.parameters.dateLocale?.raw; // default to en-GB

        // Update date utils if locale changes
        const utils = createDateUtils(this._dateLocale);
        setDateUtils(utils);

        // Update visibility
        const newVisibility = context.parameters.isVisible?.raw ?? false;
        if (newVisibility !== this._isVisible) {
            this._isVisible = newVisibility;
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
            dateLocale: this._dateLocale,
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