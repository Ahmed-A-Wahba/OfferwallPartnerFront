import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { PartnerStateService } from '../../services/partner-state.service';
import { OverviewResponse } from '../../services/partner-dashboard.service';

@Component({
  selector: 'app-publisher-header',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, RouterLink],
  templateUrl: './header.component.html',
})
export class PublisherHeaderComponent implements OnInit, OnDestroy {
  @Input() title: string = '';

  private stateService = inject(PartnerStateService);
  private sub!: Subscription;

  overview: OverviewResponse | null = null;
  logoUrl: string | null = null;
  companyInitials = 'NX';
  imageFailed = false;

  ngOnInit(): void {
    this.sub = this.stateService.loadOverview().subscribe((res) => {
      this.overview = res;
      if (res) {
        this.logoUrl = res.logoUrl || null;
        this.companyInitials = this.stateService.getInitials(res.companyName);
        this.imageFailed = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onImageError(): void {
    this.imageFailed = true;
  }
}
